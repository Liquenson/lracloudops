---
titulo: "TBF Cloud Infrastructure"
descripcion: "Full-stack SaaS platform on AWS ECS Fargate with Spring Boot 4.0.3 and React 18.3.1. 11 Terraform modules, OIDC authentication with ephemeral credentials, automated circuit breaker rollback and CloudFront OAC with differentiated cache policy."
fecha: 2026-05-01
categoria: "Platform Engineering"
madurez: "Production"
stack: ["Spring Boot 4.0.3", "Java 17", "React 18.3.1", "Vite 5.4.14", "Terraform 1.9.8", "AWS ECS Fargate", "CloudFront", "RDS PostgreSQL 15", "AWS Secrets Manager", "ALB", "S3", "GitHub Actions"]
cicd: true
github: null
featured: true
iconPath: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
draft: false
metricas:
  - { label: "Terraform Modules", value: "11" }
  - { label: "CI/CD Pipelines", value: "3" }
  - { label: "AWS Services", value: "15+" }
  - { label: "Environments", value: "Dev + Prod" }
outcomes:
  - "Deployment reliability: zero-downtime rolling updates via ECS circuit breaker"
  - "Secret security: zero static credentials — Secrets Manager + OIDC only"
  - "CDN performance: CloudFront with cache headers — assets cached 1 year"
  - "Multi-environment: dev/prod fully isolated with conditional NAT Gateway"
  - "CI/CD: 3 independent pipelines running in parallel — backend, frontend, infra"
highlights:
  - "Pure OIDC: 15-minute ephemeral IAM tokens — zero AWS keys stored in GitHub Secrets"
  - "ECS deployment circuit breaker with automatic rollback on failed deployment — no manual intervention"
  - "CloudFront OAC (not legacy OAI) with differentiated cache: assets 1 year immutable vs index.html no-cache"
  - "RDS PostgreSQL 15 Multi-AZ with deletion protection, 7-day backups and Performance Insights"
  - "11 Terraform modules: vpc, ecr, ecs_backend, rds, alb, cloudfront, s3_frontend, s3_documents, secrets_manager, nat, security_group"
  - "Dev/prod topology: dev without NAT Gateway (cost reduction), prod with private subnets and NAT"
  - "AWS Secrets Manager: credential rotation without redeployment — ECS task restart picks up new values"
  - "ECS Exec enabled in dev for direct container diagnostics without SSH"
arquitectura:
  - { nombre: "CloudFront + S3", descripcion: "Global CDN serving the React frontend with OAC (Origin Access Control) — no public S3 access" }
  - { nombre: "ALB → ECS Fargate", descripcion: "Load balancer routes traffic to Spring Boot containers — tasks have no public IPs in production" }
  - { nombre: "RDS PostgreSQL 15", descripcion: "Database in private subnets, Multi-AZ in production with automatic failover" }
  - { nombre: "AWS Secrets Manager", descripcion: "Runtime secret injection — no credentials in environment variables or source control" }
  - { nombre: "S3 Documents", descripcion: "Separate bucket for user documents with pre-signed URL access" }
  - { nombre: "NAT Gateway (prod)", descripcion: "Dev uses public subnets to eliminate NAT cost; prod uses private subnets with NAT for security" }
---

## Platform overview

A production SaaS platform deploying Spring Boot 4.0.3 and React 18.3.1 on AWS ECS Fargate. Infrastructure is fully provisioned through 11 Terraform modules. Three independent CI/CD pipelines handle backend, frontend and infrastructure changes separately. No static AWS credentials exist anywhere in the repository or CI configuration.

Traffic flows: CloudFront serves the React SPA from a private S3 bucket via OAC. API requests route through the ALB to ECS Fargate tasks running Spring Boot on port 8080. Tasks connect to RDS PostgreSQL and retrieve runtime credentials from AWS Secrets Manager at startup.

## Infrastructure design

11 Terraform modules with explicit responsibility boundaries:

- **vpc** — CIDR allocation, public/private subnets, Internet Gateway
- **nat** — NAT Gateway (provisioned only in production)
- **security_group** — firewall rules per network layer: ALB, ECS, RDS
- **ecr** — container registry with lifecycle policies
- **rds** — PostgreSQL 15 with environment-specific Multi-AZ and backup configuration
- **alb** — HTTP (dev) / HTTPS with ACM (prod) load balancer
- **secrets_manager** — DB credentials, JWT secret and SMTP credentials
- **ecs_backend** — Fargate service, task definition, execution role, log groups
- **s3_frontend** — private bucket for the React SPA
- **s3_documents** — user document storage with pre-signed URL pattern
- **cloudfront** — CDN with OAC, SPA routing rules and differentiated cache behavior

## Dev vs prod topology

The environments differ in network topology, not just resource size:

**Development** — ECS tasks run in public subnets with public IPs. Image pulls from ECR route directly without NAT Gateway. RDS runs in a single AZ without Multi-AZ failover. The NAT module is not provisioned. Cost is substantially lower.

**Production** — ECS tasks run in private subnets with no public IPs. Image pulls from ECR route through the NAT Gateway. RDS runs Multi-AZ with deletion protection and 7-day backup retention. The only inbound path to any backend component is through the ALB.

This topology difference is encoded in Terraform variables. The VPC module provisions or skips the NAT Gateway and routes based on `enable_nat_gateway`. The ECS module places tasks in the appropriate subnet tier based on configuration.

## Credential management

No secret is stored in the CI configuration. GitHub Actions authenticates to AWS via OIDC federation — the pipeline assumes an IAM role and receives a 15-minute ephemeral token. When the pipeline completes, the token expires. Nothing to rotate.

Application secrets (database password, JWT signing key, SMTP credentials) live in AWS Secrets Manager. The ECS task execution role has `secretsmanager:GetSecretValue` scoped to the specific secret ARNs for that environment. ECS injects secret values as environment variables before the container starts. Spring Boot reads them at startup without awareness of the source.

Rotating a credential requires updating the Secrets Manager secret value and restarting the ECS tasks. No redeployment of application code.

## Deployment safety

The ECS deployment circuit breaker monitors task health during rollout. If the new task definition fails its health checks, ECS stops the deployment and reverts to the previous task definition automatically. No manual intervention is required for a failed deployment.

CloudFront cache strategy: hashed asset filenames get a 1-year `immutable` cache header — the hash in the filename changes whenever the content changes, so browsers cache aggressively. The `index.html` gets `no-cache, no-store` so users always receive the current entry point. Frontend deployments invalidate CloudFront after S3 sync completes.

## Results & Metrics

- **Deployment reliability**: zero-downtime rolling updates via ECS circuit breaker
- **Secret security**: zero static credentials — Secrets Manager + OIDC only
- **CDN performance**: CloudFront with cache headers — assets cached 1 year
- **Multi-environment**: dev/prod fully isolated with conditional NAT Gateway
- **CI/CD**: 3 independent pipelines running in parallel — backend, frontend, infra
