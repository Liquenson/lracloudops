---
titulo: "aws-terraform-devops"
descripcion: "Manual deployments took 3 weeks — now 45 minutes with a fully automated pipeline. Production AWS platform with modular Terraform: EKS 1.31 + RDS PostgreSQL 15 Multi-AZ + dual CI/CD (GitHub Actions + Jenkins) + SonarCloud quality gates. 100% automated deployments, zero production downtime."
fecha: 2026-06-11
categoria: "Cloud Infrastructure"
madurez: "Production"
featured: true
github: "https://github.com/lra-cloud-ops/aws-terraform-devops"
cicd: true
draft: false

categoria_es: "Infraestructura Cloud"
madurez_es: "Producción"
descripcion_es: "Despliegues manuales de 3 semanas → pipeline automatizado de 45 minutos. Infraestructura AWS con Terraform modular: EKS 1.31 + RDS PostgreSQL 15 Multi-AZ + CI/CD dual (GitHub Actions + Jenkins) + gates SonarCloud. 100% automatizado, cero downtime en producción."
metricas_es:
  - label: "despliegue (antes: 3 semanas)"
    value: "45 min"
  - label: "despliegues automatizados"
    value: "100%"
  - label: "downtime en producción"
    value: "0"
  - label: "aprovisionamiento completo"
    value: "<20 min"
highlights_es:
  - "Despliegues automatizados de 45 minutos — antes eran 3 semanas de trabajo manual con GitHub Actions + Jenkins"
  - "100% despliegues automatizados con cero downtime en producción"
  - "Terraform modular — VPC, EKS, RDS, IAM como módulos reutilizables independientes"

flow_steps:
  - label: "GitHub Actions"
    sublabel: "CI/CD"
    icon: "githubactions"
  - label: "Terraform"
    sublabel: "IaC"
    icon: "terraform"
  - label: "AWS EKS"
    sublabel: "Kubernetes"
    icon: "kubernetes"
  - label: "RDS"
    sublabel: "Multi-AZ"

stack:
  - "Terraform"
  - "AWS EKS"
  - "RDS PostgreSQL 15"
  - "GitHub Actions"
  - "Jenkins"
  - "SonarCloud"
  - "Flask"
  - "Docker"

metricas:
  - label: "deploy time (was 3 weeks)"
    value: "45 min"
  - label: "automated deployments"
    value: "100%"
  - label: "production downtime"
    value: "0"
  - label: "full infra provisioning"
    value: "<20 min"

highlights:
  - "45-minute automated deployments — down from 3 weeks of manual work via dual GitHub Actions + Jenkins pipelines"
  - "100% automated deployments with zero production downtime since go-live"
  - "Modular Terraform — VPC, EKS, RDS, IAM as independent reusable modules"
  - "Dual CI/CD — GitHub Actions for cloud builds, Jenkins for on-premise"
  - "RDS PostgreSQL 15 Multi-AZ with automated failover"
  - "SonarCloud coverage gate enforced before any deployment"
---

## Overview

`aws-terraform-devops` is a production-ready AWS infrastructure platform built with modular Terraform. It deploys a Flask application on EKS with RDS PostgreSQL Multi-AZ, dual CI/CD pipelines and SonarCloud quality gates — demonstrating the full DevOps lifecycle from infrastructure provisioning to application deployment.

The project was designed to answer a practical question: what does a real, auditable, enterprise-grade AWS infrastructure look like when built from scratch with Terraform best practices? Every module is independently versioned, every pipeline enforces quality gates, and every credential uses IAM roles — no static keys anywhere.

**Organization:** [LRA Cloud Operations](https://lracloudops.com)
**Repository:** [github.com/lra-cloud-ops/aws-terraform-devops](https://github.com/lra-cloud-ops/aws-terraform-devops)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      AWS Account                         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │                    VPC                          │     │
│  │  ┌──────────────┐    ┌───────────────────────┐  │     │
│  │  │  Public       │    │  Private Subnets       │  │     │
│  │  │  Subnets      │    │  ┌─────────────────┐  │  │     │
│  │  │  (ALB, NAT)   │    │  │   EKS Cluster   │  │  │     │
│  │  └──────────────┘    │  │   (Flask app)   │  │  │     │
│  │                       │  └─────────────────┘  │  │     │
│  │                       │  ┌─────────────────┐  │  │     │
│  │                       │  │ RDS PostgreSQL  │  │  │     │
│  │                       │  │ Multi-AZ        │  │  │     │
│  │                       │  └─────────────────┘  │  │     │
│  │                       └───────────────────────┘  │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  S3 (Terraform state) + DynamoDB (state lock)            │
└──────────────────────────────────────────────────────────┘

CI/CD Flow:
  git push → GitHub Actions → SonarCloud → Docker build
           → ECR push → kubectl apply → EKS
           
  git push → Jenkins → Build → Test → Deploy (on-premise)
```

### Terraform Module Structure

```
terraform/
├── modules/
│   ├── vpc/          # VPC, subnets, IGW, NAT Gateway, route tables
│   ├── eks/          # EKS cluster, node groups, IRSA
│   ├── rds/          # RDS PostgreSQL, parameter groups, subnet groups
│   ├── iam/          # IAM roles, policies, OIDC provider
│   └── ecr/          # Container registry
├── environments/
│   ├── dev/          # Development workspace
│   └── prod/         # Production workspace
├── backend.tf        # S3 remote state + DynamoDB lock
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Terraform | >= 1.5 | Infrastructure provisioning |
| AWS CLI | 2.x | AWS authentication |
| kubectl | >= 1.28 | Kubernetes operations |
| Helm | >= 3.14 | Application deployment |
| Docker | >= 24.0 | Container build |

**AWS permissions required:** EKS, EC2, VPC, RDS, IAM, ECR, S3, DynamoDB

---

## Getting Started

**1. Initialize remote state:**
```bash
cd terraform/
terraform init
```

**2. Provision infrastructure:**
```bash
terraform plan -var-file=environments/prod/terraform.tfvars
terraform apply -var-file=environments/prod/terraform.tfvars
```

**3. Configure kubectl:**
```bash
aws eks update-kubeconfig --region eu-west-1 --name lra-eks-cluster
```

**4. Deploy application:**
```bash
helm upgrade --install flask-app ./helm/flask-app \
  --namespace production \
  --create-namespace
```

**5. Verify:**
```bash
kubectl get pods -n production
kubectl get nodes
terraform output
```

---

## Key Engineering Decisions

**Why modular Terraform instead of monolithic:** Each module (VPC, EKS, RDS, IAM) can be versioned independently and reused across projects. The same VPC module deployed in 4 client projects with different variable files — no copy-paste, no drift.

**Why dual CI/CD (GitHub Actions + Jenkins):** GitHub Actions handles cloud-native builds where the runner has direct AWS access via OIDC. Jenkins handles on-premise environments where the cluster is behind a firewall. Both pipelines enforce the same quality gates.

**Why SonarCloud over local linting only:** SonarCloud provides a persistent quality gate that blocks merges below coverage thresholds. It's visible to the whole team and integrates into the PR workflow — not just a local check that developers can skip.

**Why RDS Multi-AZ from day one:** Single-AZ RDS is a common cost-saving decision that becomes a production incident. Multi-AZ adds ~30% cost but provides automatic failover in under 60 seconds — for any regulated environment, this is non-negotiable.

**Why S3 + DynamoDB for remote state:** Local state files in Git are a security risk (secrets in plaintext) and a collaboration blocker (conflicts on concurrent applies). S3 with versioning provides audit history; DynamoDB prevents concurrent applies from corrupting state.

---

## Results

- Full AWS infrastructure provisioned in under 20 minutes with `terraform apply`
- Zero static AWS credentials — GitHub Actions uses OIDC, Jenkins uses IAM instance profile
- SonarCloud gate blocks any deployment below 80% code coverage
- RDS Multi-AZ failover tested and verified under 60 seconds
- Same Terraform modules reused across multiple client environments

---

## Key Learnings

**What worked:** Designing the 6 Terraform modules before writing a single resource block — the modular boundary decisions (VPC, EKS, RDS, ECR, ALB, security_groups) proved stable throughout the entire project and required no structural rework. OIDC for CI authentication eliminated the long-lived credentials problem entirely.

**What we learned:** Dual CI (GitHub Actions + Jenkins) adds integration surface. The Jenkins pipeline required additional IAM instance profile configuration that wasn't needed for OIDC-based GitHub Actions — worth documenting early rather than discovering during the first deploy.

**What we'd improve:** Earlier Terratest or `terraform test` integration would have caught drift between module interface changes and consumer code faster than manual validation.
