---
titulo: "Modular Terraform: one architecture pattern across 6 projects"
descripcion: "The Terraform module structure we use across all lra-cloud-ops projects. VPC, EKS, RDS, IAM as independent modules. S3 remote state with DynamoDB locking. How the same pattern scales from a single project to a fleet."
fecha: 2026-06-01
tags: ["Terraform", "AWS", "IaC", "EKS", "DevOps"]
draft: false
---

## Why modules instead of monolithic Terraform

The simplest Terraform configuration is a single `main.tf` that declares every resource in sequence: VPC, subnets, security groups, EKS cluster, node groups, RDS instance, IAM roles. This works for the initial deployment. It stops working the first time you need to change anything.

The blast radius of every change is the entire environment. A modification to the EKS node group configuration requires a plan that touches the VPC module, the RDS module, and every IAM resource — even though none of them changed. The diff is unreadable. Review is impossible. Confidence is low.

Module boundaries solve this. Each module owns a specific infrastructure concern, has a defined interface (input variables, output values), and can be planned and applied independently. A change to the EKS configuration produces a plan that only touches EKS resources. The VPC and RDS resources are not in the plan because they are not in the module being modified.

The lra-cloud-ops projects use this module structure consistently. The same pattern appears in aws-terraform-devops, gitops-stack, and any project that provisions AWS infrastructure. Learning it once means understanding all of them.

## Real module structure

```
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── iam/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── ecr/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   └── terraform.tfvars
│   └── prod/
│       └── terraform.tfvars
├── main.tf        ← module composition
├── variables.tf
├── outputs.tf
└── backend.tf
```

The top-level `main.tf` is the composition layer. It calls each module and passes outputs from one module as inputs to the next. The VPC module outputs subnet IDs and the VPC ID; the EKS module takes those as inputs. The dependencies are explicit and traceable.

```hcl
# terraform/modules/eks/main.tf
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = var.enable_public_endpoint
    security_group_ids      = [aws_security_group.cluster.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_iam_role_policy_attachment.vpc_resource_controller,
  ]
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-ng"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = var.desired_nodes
    min_size     = var.min_nodes
    max_size     = var.max_nodes
  }

  instance_types = [var.node_instance_type]
}
```

The module does not know which VPC it is in until runtime. It receives the subnet IDs as an input variable. This is the contract: the module requires subnet IDs to exist; it does not care how they were created.

## Remote state in S3 + DynamoDB lock

Local Terraform state is incompatible with team environments. Two engineers running `terraform apply` simultaneously against local state files produce state corruption. The second apply overwrites the first, and Terraform loses track of what was actually created.

S3 remote state with DynamoDB locking prevents this. The state file lives in S3. Before any operation that modifies state, Terraform acquires a lock by writing to a DynamoDB table. A second concurrent operation cannot acquire the lock and fails with an informative error.

```hcl
# terraform/backend.tf
terraform {
  backend "s3" {
    bucket         = "lra-cloud-ops-tfstate"
    key            = "aws-terraform-devops/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "lra-cloud-ops-tfstate-lock"
    encrypt        = true
  }
}
```

The `key` path is the critical element. Each project and each environment uses a different key. The aws-terraform-devops dev environment uses `aws-terraform-devops/dev/terraform.tfstate`. Production uses `aws-terraform-devops/prod/terraform.tfstate`. State files cannot accidentally merge.

The S3 bucket has versioning enabled. If a state file is corrupted or an apply produces an unexpected result, the previous state can be recovered from S3 history.

## OIDC in GitHub Actions — zero static credentials

The traditional approach to AWS access from GitHub Actions was to store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub secrets. These are long-lived credentials. If they are compromised — through a repository breach, a secret accidentally logged in CI output, or an engineer reusing credentials across services — they provide persistent AWS access until manually rotated.

OIDC (OpenID Connect) federation eliminates long-lived credentials. GitHub's OIDC provider issues a short-lived token for each workflow run. AWS verifies the token and issues temporary credentials scoped to a specific IAM role. The credentials expire when the workflow ends.

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
  pull_request:

permissions:
  id-token: write   # required for OIDC
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -var-file=environments/prod/terraform.tfvars

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve -var-file=environments/prod/terraform.tfvars
```

The IAM role that GitHub assumes is configured to trust only GitHub's OIDC provider and only for the specific repository:

```hcl
resource "aws_iam_role" "github_actions" {
  name = "github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:lra-cloud-ops/aws-terraform-devops:*"
        }
      }
    }]
  })
}
```

The `StringLike` condition restricts trust to a single repository. A compromised token from a different repository cannot assume this role.

## SonarCloud coverage gate

Infrastructure code has tests. The aws-terraform-devops project uses pytest with moto (AWS mock library) to test the Flask application, and SonarCloud to enforce a minimum coverage threshold before any merge to main.

The coverage gate is configured in the GitHub Actions workflow:

```yaml
- name: Run tests with coverage
  run: pytest scripts/tests/ docker/src/tests/ --cov --cov-report=xml --cov-fail-under=80

- name: SonarCloud analysis
  uses: SonarSource/sonarcloud-github-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

The `--cov-fail-under=80` flag causes pytest to exit with a non-zero status code if coverage drops below 80%. The workflow fails. The SonarCloud action does not run. The merge is blocked.

## Dual CI/CD: GitHub Actions for cloud, Jenkins for on-premise

Some environments cannot use GitHub Actions. Air-gapped networks, corporate proxies, and on-premise infrastructure frequently require a self-hosted CI system. Jenkins is the answer for gitops-stack, which runs on EKS but needs a CI pipeline that can run anywhere.

The two pipelines are complementary:

| Aspect | GitHub Actions | Jenkins |
|---|---|---|
| Trigger | git push / pull request | git push (webhook) |
| Auth | OIDC federation | IAM role on EC2 |
| Build environment | GitHub-hosted runner | Jenkins agent on EKS |
| Terraform | validate + plan + apply | validate + plan (apply via Actions) |
| Docker build | native | Docker-in-Docker |

Both pipelines produce the same artifact: a container image in ECR tagged with the commit SHA. Both validate Terraform before any apply. The redundancy is intentional — if GitHub Actions is unavailable, Jenkins can still run the pipeline.

## The pattern scales

The module structure described here scales from a single project to a fleet. Each new project creates a new S3 key for its state. Each environment gets its own `.tfvars` file. Each project composes the same modules with different variable values.

The aws-terraform-devops project uses VPC + EKS + RDS + ECR modules. The gitops-stack project uses VPC + EKS + IAM + ECR modules. The modules are not copied — they are referenced. A bug fix in the VPC module is a single change that benefits all projects using it.

This is not premature abstraction. It is the natural result of infrastructure that was designed to be operated at scale rather than deployed once and forgotten.

## See the full project

The complete Terraform configuration — all modules, environment variables, CI/CD workflows, and backend configuration — is at [github.com/lra-cloud-ops/aws-terraform-devops](https://github.com/lra-cloud-ops/aws-terraform-devops).

For the full case study including production metrics and architecture decisions, see the [aws-terraform-devops project page](/projects/aws-terraform-devops). For the AWS modernization solution we use with clients, see [AWS Modernization](/solutions/aws-modernization).
