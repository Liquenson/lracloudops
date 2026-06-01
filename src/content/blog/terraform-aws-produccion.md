---
titulo: "Production AWS Infrastructure with Terraform: EKS, RDS Multi-AZ and Dual CI/CD Pipelines"
descripcion: "Architecture decisions for a modular Terraform stack deploying Flask on EKS with RDS PostgreSQL 15 Multi-AZ, dual GitHub Actions and Jenkins pipelines, and SonarCloud coverage gates. What each decision costs and why it was made."
fecha: 2026-05-03
tags: ["Terraform", "AWS", "EKS", "Kubernetes", "IaC", "CI/CD", "Jenkins", "GitHub Actions"]
draft: false
---

## Problem

There is a meaningful difference between using AWS and designing production-grade AWS infrastructure. The first means creating resources from the console. The second means every resource is defined as code, versioned in Git, reproducible from scratch and deployable in under 30 minutes on a new account.

The gap between these two states is not technical complexity — the tools are documented. The gap is in the decisions: which resources belong in the same module, how state files are structured, what quality gates must pass before code reaches production, how environments differ without diverging.

## Context

The `aws-terraform-devops` project deploys a Flask application (Python 3.11 + Gunicorn) on Kubernetes in AWS, with managed relational database storage and a dual CI/CD pipeline. Every architectural decision was made to demonstrate production infrastructure behavior, not to demonstrate tools.

## Architecture

```
Internet → ALB → EKS (Flask + Gunicorn pods) → RDS PostgreSQL 15 Multi-AZ
                       ↑
                ECR (Docker images)
```

All components run in a multi-AZ VPC with public subnets for the load balancer and private subnets for the EKS cluster and database. No backend component has a public IP address.

## Implementation

### Module structure

The project organizes Terraform into 6 modules with distinct responsibilities:

```
modules/
├── vpc/          # VPC, public/private subnets, IGW, NAT Gateway
├── eks/          # EKS cluster, node groups, HPA configuration
├── rds/          # PostgreSQL 15, Multi-AZ, backups, security groups
├── ecr/          # Private Docker registry with lifecycle policies
├── iam/          # EKS cluster role, node roles, OIDC provider
└── cloudwatch/   # Alarms, dashboards, log groups with retention
```

IAM is a separate module by design. The roles required by EKS (cluster role, node role) are IAM resources, not EKS resources. Placing them in a dedicated module keeps the EKS module clean and allows IAM policies to evolve independently. When the cluster needs a new permission — for a CNI plugin, for external-secrets-operator — only the IAM module changes.

Module composition in the environment `main.tf`:

```hcl
module "vpc" {
  source             = "../modules/vpc"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  public_subnets     = var.public_subnets
  private_subnets    = var.private_subnets
  availability_zones = var.availability_zones
}

module "eks" {
  source               = "../modules/eks"
  environment          = var.environment
  kubernetes_version   = var.kubernetes_version
  private_subnet_ids   = module.vpc.private_subnet_ids
  vpc_id               = module.vpc.vpc_id
  instance_type        = var.instance_type
  desired_capacity     = var.desired_capacity
  min_capacity         = var.min_capacity
  max_capacity         = var.max_capacity
  eks_cluster_role_arn = module.iam.eks_cluster_role_arn
  eks_nodes_role_arn   = module.iam.eks_nodes_role_arn
}

module "rds" {
  source             = "../modules/rds"
  environment        = var.environment
  instance_class     = var.rds_instance
  private_subnet_ids = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id
}
```

Outputs from lower-layer modules feed as inputs to upper-layer modules. Network → IAM → Compute → Data. No circular dependencies.

### EKS autoscaling

The EKS module exposes capacity variables configured differently per environment:

```hcl
# environments/dev/terraform.tfvars
desired_capacity = 2
min_capacity     = 1
max_capacity     = 4
instance_type    = "t3.medium"

# environments/prod/terraform.tfvars
desired_capacity = 3
min_capacity     = 2
max_capacity     = 8
instance_type    = "t3.large"
```

The Horizontal Pod Autoscaler is configured at the Kubernetes layer to scale pods before the cluster autoscaler scales nodes. This is the correct sequence: pod scaling is faster and cheaper than node scaling. Node autoscaling is a response to sustained pod-level resource exhaustion, not to individual request spikes.

HPA is configured at provisioning time, not added after the first performance incident.

### RDS Multi-AZ: the operational behavior

Multi-AZ for RDS means AWS maintains a synchronous standby replica in a second availability zone. Every write is confirmed only after it has been committed on both the primary and the standby. In the event of a primary zone failure, automatic failover completes in 60-120 seconds with no change to the connection string — the DNS endpoint for the RDS instance automatically points to the new primary.

Security group configuration is strict: the RDS instance accepts connections only from the EKS cluster security group. No direct access from outside the cluster.

Why PostgreSQL 15 rather than Aurora: RDS PostgreSQL 15 Multi-AZ demonstrates the relevant operational concepts — failover, backup retention, security group isolation — at a lower and more predictable cost for a reference architecture. When workload volume justifies Aurora's performance characteristics, the Terraform module requires minimal changes.

### Dual pipeline: GitHub Actions and Jenkins

Two pipelines implement identical logic:

```yaml
# GitHub Actions: .github/workflows/deploy.yml
jobs:
  test:
    - run: pytest scripts/tests/ docker/src/tests/ --cov --cov-report=xml

  sonarcloud:
    - uses: SonarSource/sonarcloud-github-action@master

  docker:
    - run: |
        docker build -t $ECR_REPO:${{ github.sha }} .
        docker push $ECR_REPO:${{ github.sha }}

  deploy:
    - run: |
        helm upgrade --install webapp helm/webapp \
          --set image.tag=${{ github.sha }} --wait
```

```groovy
// Jenkins: Jenkinsfile
stages {
  stage('Test')      { steps { sh 'pytest scripts/tests/ docker/src/tests/ --cov' } }
  stage('SonarQube') { steps { withSonarQubeEnv('sonar') { sh 'mvn sonar:sonar' } } }
  stage('Docker')    { steps { sh 'docker build -t $ECR_REPO:$BUILD_NUMBER . && docker push ...' } }
  stage('Deploy EKS') { steps { sh 'helm upgrade --install webapp helm/webapp --set image.tag=$BUILD_NUMBER --wait' } }
}
```

The structure is identical: test → quality → build → push → deploy. The primitives differ (`steps { sh ... }` vs `run: |`) but the logic does not. This demonstrates that pipeline logic should not be coupled to the specific tool executing it.

### SonarCloud coverage gate

Coverage enforcement is a hard gate, not a report. If coverage drops below 80%, the pipeline stops before the Docker image is built:

```
sonar.python.coverage.reportPaths=coverage.xml
```

Tests cover both the Flask application (`docker/src/tests/`) and infrastructure scripts (`scripts/tests/`). Infrastructure tests — validating boto3 mock behavior and script logic — caught several regressions during Terraform module refactoring that would otherwise have appeared as runtime failures.

### Helm deployment

Kubernetes manifests are managed with Helm. The `--wait` flag makes the deployment operation synchronous: Helm waits for the Deployment to become healthy before reporting success. If pods fail their health checks within the configured timeout, Helm rolls back to the previous release automatically.

```bash
helm upgrade --install webapp helm/webapp \
  -f helm/webapp/values-prod.yaml \
  --set image.tag=$BUILD_NUMBER \
  --wait
```

Environment-specific values (`values-dev.yaml`, `values-prod.yaml`) configure replica counts, resource limits and environment variables without duplicating the chart structure.

### Flask application endpoints

```python
@app.route("/health")
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/ready")
def ready():
    return jsonify({"status": "ready"}), 200
```

The distinction between `/health` and `/ready` is operationally significant in Kubernetes. The liveness probe uses `/health` to determine whether a pod should be restarted. The readiness probe uses `/ready` to determine whether a pod should receive traffic from the load balancer. A pod can be alive (process running) but not ready (database connection pool exhausted). Probes that conflate these conditions produce incorrect restart or traffic routing behavior.

## Operational Considerations

**Apply time on first deploy** — EKS cluster provisioning takes 15-20 minutes. RDS Multi-AZ provisioning takes 10-15 minutes. A full initial apply exceeds 30 minutes. Subsequent applies that change only application configuration (image tag, replica count) take under 2 minutes. Separating infrastructure state from application configuration state — two distinct Terraform workspaces — allows fast application deploys without touching the infrastructure apply pipeline.

**Remote state is mandatory in teams** — two concurrent `terraform apply` calls against the same state file produce state corruption that is difficult to recover from. DynamoDB locking prevents this:

```hcl
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

A state file without locking is a liability that will produce an incident the first time two engineers or two pipeline runs execute simultaneously.

**OIDC trust policy precision** — the IAM role trust policy for GitHub Actions must specify the exact repository and branch. An overly permissive condition allows any GitHub repository — including public forks — to assume the role and access the AWS account. The sub condition should always include both the repository identifier and the branch reference:

```json
"token.actions.githubusercontent.com:sub": "repo:org/repo:ref:refs/heads/main"
```

**CloudWatch module rationale** — CloudWatch alarms and dashboards change more frequently than cluster or database configuration. New metrics are added, thresholds are adjusted, notification channels are modified. Placing observability configuration in its own module means updating a CloudWatch alarm does not trigger a plan diff against the EKS module. Each module should change at its own rate.

## Outcome

The modular Terraform approach produces infrastructure with these properties at steady state: dev and prod environments are provisioned from the same code with different variable values, making their configuration differences explicit and auditable rather than implicit and discoverable only by incident. Any environment can be reproduced from a `terraform apply`. Changes are scoped to their module and do not produce unexpected diffs in unrelated infrastructure. The dual pipeline demonstrates that deployment logic is portable across tools.

The 17 automated tests — 8 application, 9 infrastructure — enforce a quality floor that prevents regressions during refactoring. The coverage gate ensures this floor is maintained without manual enforcement.
