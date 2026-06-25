# Multi-Cloud Platform

![AWS](https://img.shields.io/badge/AWS-FF9900?style=flat&logo=amazonaws&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=flat&logo=microsoftazure&logoColor=white)
![GCP](https://img.shields.io/badge/GCP-4285F4?style=flat&logo=googlecloud&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat&logo=terraform&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active%20Development-1E6FFF?style=flat)

A multi-cloud infrastructure platform spanning AWS, Azure, and GCP — designed for portability, operational consistency, and production-grade reliability. Each cloud has a dedicated specialist; shared IaC patterns reduce duplication across providers.

---

## Architecture by Cloud Provider

| Layer | AWS | Azure | GCP |
|---|---|---|---|
| **Cluster** | EKS (managed Kubernetes) | AKS (managed Kubernetes) | GKE (managed Kubernetes) |
| **Database** | RDS PostgreSQL Multi-AZ | Azure Database for PostgreSQL | Cloud SQL PostgreSQL |
| **Networking** | VPC + ALB + Route 53 | VNet + Application Gateway + Azure DNS | VPC + Cloud Load Balancing + Cloud DNS |
| **Observability** | CloudWatch + X-Ray | Azure Monitor + Application Insights | Cloud Monitoring + Cloud Trace |

---

## Directory Structure

```
multi-cloud-platform/
├── aws/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   ├── eks/
│   │   │   ├── rds/
│   │   │   └── ecr/
│   │   └── environments/
│   │       ├── dev/
│   │       └── prod/
│   └── k8s/
│       ├── base/
│       └── overlays/
├── azure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── vnet/
│   │   │   ├── aks/
│   │   │   └── postgresql/
│   │   └── environments/
│   │       ├── dev/
│   │       └── prod/
│   └── k8s/
│       ├── base/
│       └── overlays/
├── gcp/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   ├── gke/
│   │   │   └── cloud-sql/
│   │   └── environments/
│   │       ├── dev/
│   │       └── prod/
│   └── k8s/
│       ├── base/
│       └── overlays/
├── shared/
│   ├── helm/
│   │   ├── ingress-nginx/
│   │   ├── cert-manager/
│   │   └── prometheus-stack/
│   └── argocd/
│       └── app-of-apps/
├── docs/
│   └── multi-cloud-platform-README.md
└── .github/
    └── workflows/
        ├── aws-deploy.yml
        ├── azure-deploy.yml
        └── gcp-deploy.yml
```

---

## Roadmap

### Foundation

- [ ] Define shared Terraform module interfaces across all three providers
- [ ] Establish remote state backends (S3 / Azure Blob / GCS) with locking
- [ ] Bootstrap OIDC trust between GitHub Actions and each cloud provider
- [ ] Create base VPC/VNet/VPC network modules with consistent CIDR conventions

### AWS (Lead: Ruben Liquenson)

- [ ] EKS cluster — production configuration with managed node groups
- [ ] RDS PostgreSQL Multi-AZ with automated backups and Performance Insights
- [ ] ECR repositories with enhanced vulnerability scanning (Inspector)
- [ ] CloudWatch alarms + SNS notifications for critical metrics
- [ ] ALB Ingress Controller with ACM-managed TLS certificates
- [ ] AWS Secrets Manager integration with EKS via IRSA

### Azure (Lead: Kelvin Osaigbovo)

- [ ] AKS cluster with Azure CNI and managed identity
- [ ] Azure Database for PostgreSQL Flexible Server with zone redundancy
- [ ] Azure Container Registry with geo-replication
- [ ] Azure Monitor + Application Insights for distributed tracing
- [ ] Application Gateway Ingress Controller with Azure-managed certificates
- [ ] Azure Key Vault integration with AKS via Workload Identity

### GCP (Lead: LRA Team)

- [ ] GKE Autopilot cluster — production-grade with Workload Identity
- [ ] Cloud SQL PostgreSQL with high availability and point-in-time recovery
- [ ] Artifact Registry with Container Analysis scanning
- [ ] Cloud Monitoring + Cloud Trace for observability
- [ ] Google-managed SSL certificates with Cloud Load Balancing
- [ ] Secret Manager integration with GKE via Workload Identity

### Shared Platform

- [ ] ArgoCD App-of-Apps pattern for multi-cluster GitOps
- [ ] Prometheus + Grafana unified dashboards across all three clouds
- [ ] cert-manager for cross-provider certificate lifecycle management
- [ ] Shared Helm chart library with environment overlay pattern
- [ ] Cross-cloud cost allocation tagging strategy

---

## Specialists

| Cloud | Lead Engineer | Scope |
|---|---|---|
| AWS | Ruben Liquenson | EKS, RDS, ECR, CloudWatch, Terraform |
| Azure | Kelvin Osaigbovo | AKS, Azure DB, ACR, Azure Monitor, Terraform |
| GCP | LRA Team | GKE, Cloud SQL, Artifact Registry, Cloud Monitoring |

---

## Links

- **Website:** [lracloudops.com](https://lracloudops.com)
- **GitHub Organization:** [github.com/lra-cloud-ops](https://github.com/lra-cloud-ops)
- **Contact:** info@lracloudops.com
