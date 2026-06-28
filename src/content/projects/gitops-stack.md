---
titulo: "gitops-stack"
descripcion: "Production-grade GitOps pipeline deployed on AWS EKS. Docker, Kubernetes, Jenkins CI, Terraform infrastructure, Ansible configuration management, CloudWatch observability — full DevOps lifecycle from commit to production."
fecha: 2026-06-11
categoria: "GitOps & CI/CD"
madurez: "Production"
featured: true
github: "https://github.com/lra-cloud-ops/gitops-stack"
cicd: true
draft: false

categoria_es: "GitOps y CI/CD"
madurez_es: "Producción"
descripcion_es: "Pipeline GitOps de producción desplegado en AWS EKS. Docker, Kubernetes, Jenkins CI, infraestructura Terraform, gestión de configuración con Ansible, observabilidad CloudWatch — ciclo de vida DevOps completo desde el commit hasta producción."
metricas_es:
  - label: "Build → Test → Deploy"
    value: "Etapas del pipeline"
  - label: "100% Terraform IaC"
    value: "Infraestructura"
  - label: "IAM — sin credenciales estáticas"
    value: "Identidad"
  - label: "CloudWatch + CloudTrail"
    value: "Observabilidad"
highlights_es:
  - "Pipeline GitOps completo — el commit dispara build, test y deploy automatizados a EKS"
  - "Módulos Terraform para VPC, cluster EKS, roles IAM y grupos de logs CloudWatch"
  - "Playbooks Ansible para configuración de nodos — idempotentes, versionados"

flow_steps:
  - label: "Jenkins"
    sublabel: "CI Pipeline"
    icon: "jenkins"
  - label: "Terraform"
    sublabel: "IaC"
    icon: "terraform"
  - label: "EKS"
    sublabel: "Kubernetes"
    icon: "kubernetes"
  - label: "ArgoCD"
    sublabel: "GitOps"
    icon: "argo"

stack:
  - "AWS EKS"
  - "Terraform"
  - "Jenkins"
  - "Ansible"
  - "Docker"
  - "Kubernetes"
  - "CloudWatch"
  - "AWS IAM"

metricas:
  - label: "Pipeline stages"
    value: "Build → Test → Deploy"
  - label: "Infrastructure"
    value: "100% Terraform IaC"
  - label: "Identity"
    value: "IAM — zero static credentials"
  - label: "Observability"
    value: "CloudWatch + CloudTrail"

highlights:
  - "Full GitOps pipeline — commit triggers automated build, test and deploy to EKS"
  - "Terraform modules for VPC, EKS cluster, IAM roles and CloudWatch log groups"
  - "Ansible playbooks for node configuration — idempotent, version-controlled"
  - "Jenkins CI with declarative pipeline — Docker build, push to ECR, deploy to EKS"
  - "AWS Systems Manager (SSM) for automated node configuration — no SSH keys"
  - "CloudTrail audit trail — every API call logged and queryable"
---

## Overview

`gitops-stack` is a production-grade GitOps pipeline deployed on AWS EKS. It demonstrates the complete DevOps lifecycle: from infrastructure provisioning with Terraform, through application containerization with Docker, continuous integration with Jenkins, configuration management with Ansible, deployment to Kubernetes, and full observability with CloudWatch and CloudTrail.

The project was built to answer a specific question: what does a real, auditable, enterprise-grade pipeline look like from scratch? Every component is version-controlled, every change is traceable, and every credential follows least-privilege IAM principles.

**Organization:** [LRA Cloud Operations](https://lracloudops.com)
**Repository:** [github.com/lra-cloud-ops/gitops-stack](https://github.com/lra-cloud-ops/gitops-stack)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Developer Workflow                    │
│                                                         │
│  git push → GitHub → Jenkins CI Pipeline                │
│                            │                            │
│              ┌─────────────┼─────────────┐              │
│              ▼             ▼             ▼              │
│           Build          Test          Deploy           │
│         (Docker)       (pytest)      (kubectl)          │
│              │                          │               │
│              ▼                          ▼               │
│       Amazon ECR                   AWS EKS              │
│    (Container Registry)         (Kubernetes)            │
└─────────────────────────────────────────────────────────┘
```

**Infrastructure Layer (Terraform):**
VPC + Subnets → EKS Cluster → IAM Roles → CloudWatch

**Configuration Layer (Ansible):**
Node setup → Package installation → Service configuration

**Observability Layer (AWS):**
CloudWatch Logs → CloudWatch Metrics → CloudTrail Audit

### Repository Structure

```
gitops-stack/
├── .github/workflows/     # GitHub Actions (CI triggers)
├── ansible/               # Node configuration playbooks
├── app/                   # Application source code
├── k8s/                   # Kubernetes manifests
├── scripts/               # Automation scripts
├── terraform/             # Infrastructure as Code
├── tests/                 # Test suite
├── Dockerfile             # Container definition
└── Jenkinsfile            # Pipeline definition
```

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| AWS CLI | 2.x | AWS authentication |
| Terraform | >= 1.5 | Infrastructure provisioning |
| kubectl | >= 1.28 | Kubernetes operations |
| Ansible | >= 2.14 | Configuration management |
| Docker | >= 24.0 | Container build |
| Jenkins | LTS | CI/CD server |

**AWS permissions required:** EKS, EC2, VPC, IAM, ECR, CloudWatch, CloudTrail, SSM

---

## Getting Started

**1. Provision infrastructure:**
```bash
cd terraform/
terraform init
terraform plan
terraform apply
```

**2. Configure nodes:**
```bash
cd ansible/
ansible-playbook -i inventory playbook.yml
```

**3. Deploy application:**
```bash
kubectl apply -f k8s/
```

**4. Verify:**
```bash
kubectl get nodes
kubectl get pods -n production
```

---

## Key Engineering Decisions

**Why Jenkins over GitHub Actions for CI:** Jenkins provides full control over the build environment and integrates directly with the EKS cluster inside the VPC without exposing external endpoints.

**Why Ansible for node configuration:** Ansible playbooks are idempotent. Combined with SSM, this eliminates SSH keys entirely. Node configuration is version-controlled and auditable.

**Why IAM roles instead of access keys:** Every AWS service interaction uses IAM roles with least-privilege policies. No static credentials exist in the codebase or environment variables.

**Why CloudTrail alongside CloudWatch:** CloudWatch monitors operational metrics. CloudTrail records every AWS API call — who did what, when, from where. Together they provide operational visibility and security audit capability.

---

## Results

- Full infrastructure provisioned in under 15 minutes with `terraform apply`
- Zero SSH keys — all node access via SSM Session Manager
- Complete audit trail from every commit to every Kubernetes pod
- Pipeline runs in under 8 minutes from push to production deployment

---

## Key Learnings

**What worked:** Replacing SSH key distribution with SSM Session Manager was the single highest-leverage security decision — it eliminated an entire class of credential management problems and made the audit trail complete.

**What we learned:** Jenkins inside a private VPC requires careful security group planning before the first pipeline run. Leaving this to Day 2 operations meant two rounds of security group edits; designing it upfront would have been cleaner.

**What we'd improve:** Integrating Ansible Vault for secrets management from the beginning rather than using environment variables — would make the credential lifecycle cleaner across ECS task roles and EC2 instance profiles.
