---
titulo: "GitOps Stack — EKS Production Pipeline"
descripcion: "Production GitOps CI/CD pipeline on AWS EKS 1.35: 7-stage Jenkins with STS role assumption, SSM-based Ansible node configuration on Amazon Linux 2023, Terraform-managed VPC with 22 IAM identities in 5 groups. Zero SSH keys — all cluster access via IAM AssumeRole and AWS Systems Manager."
fecha: 2026-06-02
categoria: "GitOps & CI/CD"
madurez: "Production"
stack: ["Python 3.11", "Flask 3.0.0", "pytest 7.4.0", "Terraform 1.9", "AWS EKS 1.35", "Jenkins 2.555", "GitHub Actions", "Ansible 2.10", "AWS SSM", "Docker", "AWS ECR", "Kubernetes", "CloudWatch"]
cicd: true
github: "https://github.com/Liquenson/gitops-stack"
featured: true
iconPath: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
draft: false
metricas:
  - { label: "Pipeline stages", value: "7 (Jenkins)" }
  - { label: "IAM identities", value: "22 users · 5 groups" }
  - { label: "EKS nodes", value: "min 1 · desired 2 · max 3" }
  - { label: "Ansible roles", value: "3 (common · security · monitoring)" }
highlights:
  - "7-stage Jenkins pipeline: Test → Build → ECR Push → Terraform → Ansible SSM → Kubernetes → Rollout verify"
  - "No SSH keys anywhere: EKS node access exclusively via AWS Systems Manager Session Manager"
  - "STS AssumeRole: Jenkins assumes eks-admin-role with session name jenkins-deploy-${BUILD_NUMBER} — every deploy is a CloudTrail entry"
  - "22 IAM identities managed as Terraform code: devops-team, developers, security-team, monitoring-team, data-team"
  - "Ansible via community.aws.aws_ssm: zero-credential node configuration on Amazon Linux 2023"
  - "CloudWatch Agent on all EKS nodes: CPU, memory, disk metrics + /var/log/messages and /var/log/secure (30-day retention)"
  - "Terraform S3 backend with remote state: full environment reproducible from a single terraform apply"
  - "Amazon Linux 2023 specifics: firewalld, dnf-automatic, ssm-user, and /tmp/.ansible/tmp compatibility handled"
arquitectura:
  - { nombre: "VPC + EKS 1.35", descripcion: "Multi-AZ VPC (10.0.0.0/16) with private and public subnets in eu-west-1a/1b, single NAT Gateway and 2x t3.small managed node group carrying AmazonSSMManagedInstanceCore" }
  - { nombre: "7-Stage Jenkins Pipeline", descripcion: "pytest → Docker build → ECR push → terraform apply (manual approval) → Ansible SSM → kubectl apply → rollout status. Fail-fast: any failure stops the pipeline immediately" }
  - { nombre: "IAM Role Assumption + STS", descripcion: "Jenkins assumes eks-admin-role via STS AssumeRole with 1-hour temporary credentials. Session name jenkins-deploy-${BUILD_NUMBER} creates an auditable CloudTrail entry per deployment" }
  - { nombre: "Ansible via AWS SSM", descripcion: "community.aws.aws_ssm plugin connects to EKS nodes using EC2 Instance IDs — no SSH keys, no bastion. Runs 4 plays: common, security, monitoring, verify" }
  - { nombre: "CloudWatch Observability", descripcion: "CloudWatch Agent deployed on all nodes via Ansible: CPU/memory/disk at 60s intervals, /var/log/messages and /var/log/secure forwarded to CloudWatch Logs with 30-day retention" }
  - { nombre: "IAM Identity Management", descripcion: "22 users in 5 groups as Terraform code: devops-team (EKS + ECR), developers (ECR PowerUser), security-team (IAM read), monitoring-team (CloudWatch), data-team (S3 + RDS)" }
---

## Platform overview

A production GitOps delivery platform that automates the complete software lifecycle on AWS EKS — from code push to rolling deployment. The project solves three concrete DevOps problems: manual deployment errors (eliminated by a 7-stage automated pipeline), insecure cluster access (replaced with IAM role assumption and no SSH keys), and non-reproducible infrastructure (Terraform-managed from VPC to IAM identities).

Git is the single source of truth for code, infrastructure, configuration, and access. No change reaches production without a Pull Request, passing tests, and a traceable deployment event in CloudTrail.

## Infrastructure design

The VPC spans two availability zones in eu-west-1 with private subnets for EKS nodes and a single NAT Gateway for outbound internet access. EKS 1.35 runs on two t3.small managed nodes with autoscaling between 1 and 3.

All EKS nodes carry the `AmazonSSMManagedInstanceCore` IAM policy. This is what makes Ansible access possible without SSH: AWS Systems Manager creates an encrypted session to the node via the SSM API, using IAM authentication rather than key pairs.

Remote state lives in S3 (`devops-lab-tfstate-538079272432/gitops-stack/eks/terraform.tfstate`). The full environment is reproducible from zero with a single `terraform apply`.

## Identity model

22 IAM users across 5 groups — all defined in `terraform/users.tf` and managed as code:

- **devops-team** — EKS cluster policy, ECR full access, CloudWatch read
- **developers** — ECR PowerUser, CloudWatch Logs read
- **security-team** — IAM read-only
- **monitoring-team** — CloudWatch read-only
- **data-team** — S3 full access, RDS read-only

No IAM user has direct cluster admin access. Admin access flows exclusively through `eks-admin-role`, which Jenkins and the designated CLI user assume via STS. Every assumption produces a CloudTrail record.

## Pipeline design

Seven stages with strict fail-fast behavior: any stage failure stops the pipeline immediately. Tests run first — a failing test produces no Docker image, no ECR push, and no deployment.

The Terraform stage requires manual approval between `plan` and `apply`. Infrastructure changes are reviewed before they apply — the plan output is visible in Jenkins before the operator confirms.

Stage 6 (Kubernetes deploy) uses STS-assumed credentials that expire in 60 minutes. Jenkins does not hold static kubectl configuration. The session name `jenkins-deploy-${BUILD_NUMBER}` links each cluster change to a specific build number in CloudTrail. There is no deployment without a traceable identity.

## Ansible on Amazon Linux 2023

Amazon Linux 2023 has breaking differences from AL2 that required explicit handling:

- `firewalld` instead of UFW — the security role installs and configures firewalld
- `dnf-automatic` instead of `unattended-upgrades` — enables automated security patching
- Default remote user is `ssm-user` — configured in ansible.cfg
- Ansible temp directory is `/tmp/.ansible/tmp` — the default `~/.ansible/tmp` fails without a proper home directory

The monitoring role installs the CloudWatch Agent via RPM, deploys a JSON configuration collecting CPU, memory, and disk metrics at 60-second intervals alongside system logs, and starts the agent as a systemd service.

## Key decisions

**Why Jenkins alongside GitHub Actions** — Jenkins runs on-premise and holds the Terraform apply. Infrastructure credentials stay off GitHub's infrastructure. GitHub Actions validates PRs and pushes to Docker Hub; Jenkins owns the production deployment path with a human-approval gate.

**Why manual approval before terraform apply** — Terraform plan output shows exactly what will change before it changes. The gate between plan and apply prevents automated infrastructure changes from running unseen. Operators review the plan; Jenkins executes the apply.

**Why STS role assumption instead of long-lived credentials** — The credentials Jenkins uses for EKS expire in 60 minutes. There are no static AWS credentials that could be rotated or leaked. The role assumption also decouples the Jenkins identity from the cluster admin permission — the role can be revoked without changing Jenkins configuration.
