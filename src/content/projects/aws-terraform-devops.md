---
titulo: "AWS Terraform DevOps Platform"
titulo_es: "Plataforma AWS Terraform DevOps"
descripcion: "Production AWS environment with EKS 1.31, HPA at 70% CPU, RDS PostgreSQL 15 Multi-AZ and 6 modular Terraform modules. Dual CI/CD pipeline with GitHub Actions and Jenkins, SonarCloud coverage gate at ≥80% and CloudWatch proactive alarms."
descripcion_es: "Entorno AWS de producción con EKS 1.31, HPA al 70% CPU, RDS PostgreSQL 15 Multi-AZ y 6 módulos Terraform modulares. Pipeline CI/CD dual con GitHub Actions y Jenkins, quality gate SonarCloud al ≥80% y alarmas proactivas en CloudWatch."
highlights_es:
  - "Infraestructura Multi-AZ con 6 módulos Terraform: VPC, EKS, RDS, ECR, IAM y CloudWatch — estado remoto en S3"
  - "Pipeline CI/CD dual: GitHub Actions para despliegue automático + Jenkins para build, test y análisis de calidad"
  - "RDS PostgreSQL 15 Multi-AZ con backups automatizados y réplica de lectura para alta disponibilidad"
  - "HPA configurado al 70% CPU: la aplicación escala automáticamente según la carga de trabajo"
  - "Quality gate SonarCloud ≥80% cobertura aplicado en cada pull request — ningún código deficiente llega a producción"
  - "Alarmas CloudWatch proactivas: alertas antes de que los usuarios experimenten degradación del servicio"
fecha: 2026-05-01
categoria: "Cloud Infrastructure"
madurez: "Production"
stack: ["Flask 3.0.3", "Python 3.11", "Terraform 1.9.8", "AWS EKS 1.31", "RDS PostgreSQL 15", "ECR", "Docker", "GitHub Actions", "Jenkins", "Helm", "Gunicorn", "SonarCloud", "CloudWatch"]
cicd: true
github: "https://github.com/Liquenson/aws-terraform-devops"
featured: true
iconPath: "M3 15a4 4 0 004 4h10a4 4 0 001-7.9A5 5 0 106 6.6"
draft: false
metricas:
  - { label: "Terraform Modules", value: "6" }
  - { label: "Automated Tests", value: "17 (8 Flask + 9 infra)" }
  - { label: "Pipelines", value: "2 parallel" }
  - { label: "Environments", value: "Dev + Prod" }
outcomes:
  - "Pipeline execution: commit to production in under 12 minutes"
  - "Code quality: 80%+ test coverage enforced on every merge"
  - "Infrastructure: 6 Terraform modules, fully reusable across projects"
  - "Scalability: HPA configured — auto-scales from 2 to 20 pods under load"
  - "Observability: CloudWatch alarms on CPU >80%, Memory >85%"
highlights:
  - "Terraform 100% modular: 6 modules (vpc, eks, rds, ecr, iam, cloudwatch) with S3 remote state + DynamoDB locking + SSE-S3"
  - "EKS 1.31 with HPA at 70% CPU threshold, rolling update maxUnavailable=0 and resource limits"
  - "RDS PostgreSQL 15 Multi-AZ with automatic failover, 7-day backups and strict security group isolation"
  - "CloudWatch proactive alarms: CPU>80%, Memory>85%, 30-day log retention"
  - "17 tests: 8 Flask (100% endpoint coverage) + 9 infrastructure tests with boto3 mocks"
  - "Multi-stage Dockerfile, non-root user and automountServiceAccountToken: false"
  - "SonarCloud integrated with ≥80% coverage gate enforced before Docker build"
  - "Dual pipeline: GitHub Actions + Jenkins running identical logic in parallel"
arquitectura:
  - { nombre: "Multi-AZ VPC", descripcion: "6 Terraform modules with S3 remote state, DynamoDB locking and SSE-S3 encryption" }
  - { nombre: "AWS EKS 1.31", descripcion: "Managed Kubernetes cluster with HPA at 70% CPU and rolling update maxUnavailable=0" }
  - { nombre: "RDS PostgreSQL 15 Multi-AZ", descripcion: "Database in private subnets with synchronous standby, automatic failover and 7-day backups" }
  - { nombre: "ALB + Target Groups", descripcion: "Layer 7 load balancer with health checks and TLS termination" }
  - { nombre: "ECR + CloudWatch", descripcion: "Private image registry with lifecycle policies and proactive CPU/Memory alarms" }
  - { nombre: "IAM Roles + OIDC", descripcion: "Credential-free authentication for GitHub Actions via OIDC federation" }
---

## Platform overview

A production AWS environment deploying Flask 3.0.3 + Gunicorn on EKS 1.31, with RDS PostgreSQL 15 in a Multi-AZ configuration and a dual CI/CD pipeline implemented in both GitHub Actions and Jenkins. Every resource is defined in Terraform. No resource was created from the AWS console.

The full stack is reproducible from a single `terraform apply`. Dev and prod environments use the same module definitions with different variable values — the differences between environments are explicit and auditable.

## Infrastructure design

Six Terraform modules with distinct responsibilities:

- **vpc** — VPC, public and private subnets, Internet Gateway, NAT Gateway
- **eks** — EKS cluster 1.31, managed node groups, HPA configuration
- **rds** — PostgreSQL 15 Multi-AZ in private subnets with 7-day backup retention
- **ecr** — Private container registry with image lifecycle policies
- **iam** — EKS cluster and node roles, OIDC provider for GitHub Actions
- **cloudwatch** — Alarms at CPU>80% and Memory>85%, log groups with 30-day retention

IAM is a dedicated module because EKS roles are IAM resources, not EKS resources. The separation allows IAM policies to evolve independently when cluster permissions need updating.

Remote state lives in S3 with DynamoDB locking. Two concurrent applies against the same state file produce corruption — locking prevents this by design.

## Compute and scaling

EKS node groups are managed as code. HPA is configured at cluster provisioning time with a 70% CPU threshold — not added after the first performance incident. Rolling update policy sets `maxUnavailable=0`, ensuring zero-downtime deployments at the cost of requiring capacity headroom during the rollout.

## Database layer

RDS PostgreSQL 15 operates in Multi-AZ configuration. Each write is committed to both primary and synchronous standby before acknowledging to the application. Failover to the standby completes in 60-120 seconds with no connection string change — the RDS DNS endpoint routes automatically to the active instance.

The security group allows connections only from the EKS cluster security group. No direct public access to the database at any network path.

## Pipeline design

Both pipelines implement the same four stages: test → quality → Docker build → Helm deploy. The logic is identical. The platform primitives differ.

SonarCloud enforces a ≥80% coverage gate. If coverage drops below threshold, the pipeline terminates before building the Docker image. The ECR registry stays clean — no images built from code that does not meet the quality threshold.

`helm upgrade --install webapp ... --wait` makes deployment synchronous. If pods fail health checks within the configured timeout, Helm rolls back to the previous release. Every deployment is an atomic, recoverable operation.

## Key decisions

**Why both GitHub Actions and Jenkins** — the deployment logic should not be coupled to the platform executing it. The same test-quality-build-deploy structure runs on both. When an organization switches CI platforms, the pipeline principles transfer.

**Why separate CloudWatch module** — observability configuration changes at a different rate than cluster infrastructure. Adjusting an alarm threshold should not produce a plan diff against the EKS module. Each module changes at its own rate.

**Why remote state from day one** — a local state file becomes a single point of failure the first time two engineers or two pipeline runs execute simultaneously. Distributed state with locking is not optional in a team environment.

## Results & Metrics

- **Pipeline execution**: commit to production in under 12 minutes
- **Code quality**: 80%+ test coverage enforced on every merge
- **Infrastructure**: 6 Terraform modules, fully reusable across projects
- **Scalability**: HPA configured — auto-scales from 2 to 20 pods under load
- **Observability**: CloudWatch alarms on CPU >80%, Memory >85%
