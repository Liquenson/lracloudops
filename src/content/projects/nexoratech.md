---
titulo: "NexoraTech SaaS Platform"
descripcion: "Enterprise SaaS platform with Spring Boot 4.0.3, React 18 and AWS ECS Fargate. JWT + MFA TOTP authentication, Testcontainers integration testing against real PostgreSQL, 10 Terraform modules and three OIDC CI/CD pipelines."
fecha: 2026-05-08
categoria: "Platform Engineering"
madurez: "Production"
stack: ["Spring Boot 4.0.3", "Java 17", "React 18.3.1", "Vite 5.4.14", "Zustand", "i18next", "JJWT 0.12.6", "Flyway", "Testcontainers", "MapStruct", "PostgreSQL 15", "Terraform 1.9.8", "AWS ECS Fargate", "CloudFront", "ALB", "S3", "RDS", "Docker", "GitHub Actions", "AWS Secrets Manager"]
cicd: true
github: null
featured: false
iconPath: "M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z"
draft: false
metricas:
  - { label: "Terraform Modules", value: "10" }
  - { label: "Environments", value: "Dev / Staging / Prod" }
  - { label: "CI/CD Pipelines", value: "3 parallel" }
  - { label: "Security Layers", value: "JWT + MFA + OIDC" }
highlights:
  - "BCryptPasswordEncoder + JJWT 0.12.6 stateless (1h expiry, 256+ bits) + MFA TOTP with failure counter and account lockout"
  - "MapStruct DTOs: no JPA entity is exposed directly in the API — zero serialization leaks"
  - "Flyway with validate-on-migrate=true: migration mismatch fails at startup before the application serves requests"
  - "Testcontainers: integration tests run against real PostgreSQL — same dialects and constraints as production"
  - "OIDC federation: 15-minute ephemeral IAM tokens — zero AWS keys in GitHub Secrets across all pipelines"
  - "Terraform 100% modular: 10 independent modules (VPC, ECS, RDS, ALB, CloudFront, S3, Secrets, ECR, Security Groups)"
  - "CloudFront OAC + differentiated cache: hashed assets 1 year immutable, index.html no-cache"
  - "ECS deployment circuit breaker with automatic rollback on failed health checks"
  - "Dev vs prod: dev without NAT Gateway (saves ~$35/month), prod with private subnets, Multi-AZ and deletion protection"
arquitectura:
  - { nombre: "React 18 + CloudFront", descripcion: "SPA served from private S3 via CloudFront OAC with aggressive caching for hashed assets and automatic invalidation on each deploy" }
  - { nombre: "Spring Boot 4 on ECS Fargate", descripcion: "Serverless containers with no EC2 management. Dev: 1 public task; Prod: 2 tasks in private subnets with NAT" }
  - { nombre: "RDS PostgreSQL 15", descripcion: "Managed database with encryption at rest, 7-day automated backups in production, Multi-AZ failover and Performance Insights" }
  - { nombre: "AWS Secrets Manager", descripcion: "DB, JWT and SMTP credentials stored in Secrets Manager. Injected as environment variables into ECS task definitions at runtime" }
  - { nombre: "Terraform Modular (10 modules)", descripcion: "VPC, Security Groups, ECR, RDS, Secrets, ALB, ECS, S3 Frontend, S3 Documents, CloudFront — each independently deployable" }
  - { nombre: "GitHub Actions + OIDC", descripcion: "Three pipelines: backend (Maven → ECR → ECS), frontend (Vite → S3 → CloudFront), infrastructure (Terraform plan/apply). No hardcoded credentials" }
  - { nombre: "JWT + MFA TOTP", descripcion: "Stateless authentication with JJWT 0.12.6. Optional MFA with TOTP, QR code setup flow and account lockout on consecutive failures" }
---

## Platform overview

An enterprise SaaS platform covering all layers of the production stack: stateless JWT + MFA TOTP authentication, a React SPA delivered through CloudFront, Spring Boot 4 API on ECS Fargate, RDS PostgreSQL 15 with Flyway-managed schema, and 10 Terraform modules provisioning the full AWS environment. Three separate CI/CD pipelines operate independently with OIDC authentication throughout.

## Security architecture

Authentication is stateless. No server-side sessions. Every request carries a JWT in the `Authorization: Bearer` header. Token expiry is 1 hour. The security module is isolated in `infrastructure/security/` — `JwtService`, `JwtFilter` and `SecurityConfig` — with no coupling to business logic.

MFA TOTP is enforced at login. The flow: validate password → validate 6-digit TOTP code from authenticator app → issue JWT. Consecutive TOTP failures trigger account lockout with a calculated unlock timestamp. The frontend `OtpInput` component handles the TOTP step identically to banking and enterprise authentication flows.

Flyway `validate-on-migrate=true` means a migration schema mismatch fails the application at startup before it serves any requests. Schema integrity is verified on every deployment.

MapStruct generates DTO-to-entity mappers at compile time. No JPA entity is serialized directly into API responses. Serialization leaks — exposing internal entity relationships through JSON — are structurally prevented.

## Infrastructure

10 independent Terraform modules. The `secrets` module exists as a separate layer because DB credentials are created by the RDS module, referenced by the ECS module, and need a lifecycle independent of both. Separating secrets into a dedicated module eliminates the circular dependency while making credential management the explicit responsibility of a single module.

Dev environment: ECS tasks in public subnets, no NAT Gateway, RDS in single-AZ, no deletion protection. Production environment: ECS tasks in private subnets, NAT Gateway for outbound access, RDS Multi-AZ with deletion protection and Performance Insights.

## Testing

Testcontainers spins up a real PostgreSQL 15 container for integration tests. H2 in-memory databases accept SQL that PostgreSQL rejects — particularly around constraint handling, JSON column types and certain aggregate functions. Tests running against H2 can pass while the equivalent operations fail against the production database. Testcontainers eliminates this gap.

Flyway `validate-on-migrate` runs against the Testcontainers database during integration testing. If a migration is missing or inconsistent with the current entity schema, tests fail before the code reaches CI.

## CI/CD

Three OIDC-authenticated pipelines with separated concerns:

- **backend.yml** — Maven test → JaCoCo report → Docker build with commit SHA tag → ECR push → ECS force deploy
- **frontend.yml** — `npm ci && npm run build` with `VITE_API_URL` → S3 sync with differentiated cache-control → CloudFront invalidation
- **terraform.yml** — `fmt -check + validate` → `plan` with PR comment → `apply -auto-approve` on merge to main

GitHub Actions assumes the appropriate IAM role via OIDC. The Terraform role and Deploy role have separate, minimal permissions. No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` exists in the repository secrets.
