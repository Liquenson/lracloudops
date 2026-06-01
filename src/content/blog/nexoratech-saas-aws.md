---
titulo: "Deploying a SaaS Platform on AWS ECS Fargate: Architecture and Operational Decisions"
descripcion: "Architecture decisions behind NexoraTech: traffic flow, Terraform module boundaries, dev/prod topology differences, OIDC CI/CD without static credentials, CloudFront cache strategy and Testcontainers integration testing."
fecha: 2026-05-08
tags: ["AWS", "ECS Fargate", "Terraform", "Spring Boot", "React", "CloudFront", "DevOps", "SaaS", "OIDC"]
draft: false
---

## Problem

Deploying a SaaS platform on AWS is not primarily a coding problem. It is a series of infrastructure decisions that determine operational cost, security posture, recovery behavior and the team's ability to change things safely over time.

Most architectural guidance focuses on what to build. This article focuses on the decisions made while building NexoraTech — a Spring Boot 4 and React 18 platform on AWS ECS Fargate — specifically the decisions where the obvious choice was wrong, and why.

## Context

NexoraTech is a full-stack SaaS platform with a stateless backend API, a React single-page application delivered via CloudFront, and a PostgreSQL database on RDS. The full stack runs on AWS with 10 Terraform modules, three independent CI/CD pipelines and no static AWS credentials anywhere in the CI configuration.

The architecture is designed for two environments: dev, which runs at minimal cost for active development, and prod, which runs with full availability and security controls.

## Architecture

Traffic flow:

```
Users ──► CloudFront ──► S3 (React SPA — static assets)
               │
               └──► ALB ──► ECS Fargate (Spring Boot :8080)
                                  └──► RDS PostgreSQL 15
                                  └──► Secrets Manager
                                  └──► S3 Documents
```

The frontend never touches the backend for static content. CloudFront serves the SPA directly from S3. The backend receives only API requests routed from the ALB. Scaling the CDN layer and scaling the compute layer are completely independent operations.

## Implementation

### Terraform module structure and the secrets module decision

```
infra/modules/
├── vpc/               # Network topology: CIDRs, subnets, IGW, NAT conditional
├── security_groups/   # Firewall rules per layer
├── ecr/               # Container registry with lifecycle policies
├── rds/               # PostgreSQL 15 with environment-specific parameters
├── secrets/           # DB, JWT and SMTP credentials in Secrets Manager
├── alb/               # Load balancer HTTP/HTTPS
├── ecs_backend/       # Fargate service, task definition, IAM, logs
├── s3_frontend/       # Private bucket for the SPA
├── s3_documents/      # User document storage
└── cloudfront/        # CDN with OAC, SPA routing, cache headers
```

The `secrets` module was separated last. Initially, secret creation lived inside the `rds` module (which creates the database password) and the `ecs_backend` module (which injects the secret into the task definition). This created a circular reference: ECS needed to know the secret ARN before RDS created it, and RDS needed to know the ECS role ARN to scope the secret policy.

Extracting secrets into a dedicated module with no upstream dependencies solved the circular reference: the secrets module creates the secret and outputs its ARN; the RDS and ECS modules accept that ARN as an input.

### Dev vs prod: topology, not just configuration

The most significant difference between environments is network topology, not instance size:

```hcl
# environments/dev/terraform.tfvars
enable_nat_gateway    = false
ecs_subnet_type       = "public"      # Tasks have public IPs
rds_multi_az          = false
rds_instance_class    = "db.t3.micro"
rds_backup_retention  = 1

# environments/prod/terraform.tfvars
enable_nat_gateway    = true
ecs_subnet_type       = "private"     # Tasks have no public IPs
rds_multi_az          = true
rds_instance_class    = "db.t3.small"
rds_backup_retention  = 7
rds_deletion_protection = true
```

In dev, ECS tasks run in public subnets. They can reach ECR directly to pull images, without a NAT Gateway. A NAT Gateway costs approximately $32/month fixed plus data transfer charges. Eliminating it in dev reduces the development environment cost substantially.

In prod, ECS tasks run in private subnets. Image pulls from ECR route through the NAT Gateway. Tasks have no public IP. The only network entry point is the ALB, which lives in public subnets and forwards requests to the ECS security group.

This is not a configuration difference that can be toggled with a variable. Moving from public to private subnets changes security group rules, routing tables and how the VPC module provisions NAT infrastructure. The `enable_nat_gateway` variable changes the behavior of the VPC module completely.

### Secrets Manager: the injection mechanism

The `secrets` module provisions credentials in Secrets Manager:

```hcl
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.environment}/nexoratech/db"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    endpoint = module.rds.endpoint
    dbname   = var.db_name
  })
}
```

The `ecs_backend` module injects secrets into the task definition:

```hcl
secrets = [
  {
    name      = "DB_PASSWORD"
    valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:password::"
  },
  {
    name      = "JWT_SECRET"
    valueFrom = "${aws_secretsmanager_secret.jwt.arn}:secret::"
  }
]
```

ECS retrieves values from Secrets Manager before starting the container and injects them as environment variables. Spring Boot reads them at startup as if they came from a `.env` file. The execution role has `secretsmanager:GetSecretValue` scoped to the specific ARNs for that environment — not a wildcard.

### OIDC: three pipelines, zero static credentials

All three pipelines authenticate to AWS via OIDC federation:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    aws-region: eu-west-1
```

The IAM role trust policy scopes access to the specific repository and branch:

```json
{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub":
        "repo:Liquenson/nexoratech:ref:refs/heads/main"
    }
  }
}
```

Configuring OIDC is straightforward. The complexity is in the IAM permissions for each role. Too permissive and it is a security risk. Too restrictive and the pipeline fails with unhelpful AccessDenied errors at unexpected steps. CloudTrail was used to observe exactly what API calls each pipeline makes, then permissions were written to match that call set.

Two separate roles — Terraform role (PowerUserAccess + IAM) and Deploy role (ECR, ECS, S3, CloudFront) — keep blast radius minimal.

### CloudFront cache strategy

Vite generates hashed asset filenames:

```
dist/
├── index.html
├── assets/main.a3f8c912.js      # hash in filename
├── assets/vendor.b2d1e445.js
└── assets/style.4f7a8901.css
```

The cache strategy differentiates by path:

- `/index.html` → `no-cache, no-store` (always fetch current version)
- `/assets/*` → `max-age=31536000, immutable` (1-year cache; hash guarantees filename changes with content)

This eliminates the "clear cache to see changes" problem. The `index.html` is always fresh. Assets are immutable because their filename contains a content hash. A new deployment updates only `index.html` and the new asset filenames — users with the previous version loaded continue using those cached assets until they navigate.

The pipeline invalidates CloudFront after every S3 deployment:

```yaml
- name: Invalidate CloudFront
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
      --paths "/*"
```

### Testcontainers: integration tests against real PostgreSQL

Integration tests spin up a real PostgreSQL container rather than using H2 in-memory:

```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("test_db");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
    }

    @Test
    void shouldPersistUser() {
        // runs against real PostgreSQL — same engine as production
    }
}
```

H2 in-memory databases have different SQL semantics from PostgreSQL. Tests that pass with H2 can fail with PostgreSQL on constraints, index behavior or function availability. Testcontainers eliminates this class of false positive by running tests against the production database engine.

The tradeoff: tests take longer because Docker must pull and start the container. The benefit: tests that pass are actually evidence that the application works with the production database.

## Operational Considerations

**Secrets rotation** — rotating the database password requires three steps: update the secret value in Secrets Manager, update the RDS instance password to match, and force a new ECS task deployment so containers pick up the new value at startup. This sequence must be documented and automated — a manual rotation process that depends on institutional knowledge will be executed incorrectly under pressure.

**OAC vs OAI** — Origin Access Control (OAC) is the current CloudFront mechanism for private S3 access. Origin Access Identity (OAI) is the legacy approach. OAC supports AWS SigV4 signing and is recommended for all new deployments. Migrating from OAI to OAC requires updating both the CloudFront distribution and the S3 bucket policy — not just one of them.

**Terraform state for the first apply** — the first apply creates the S3 bucket used for Terraform state. The backend configuration cannot reference a bucket that does not exist yet. The bootstrap sequence: apply the S3 and DynamoDB resources first with a local backend, then migrate state to the remote backend before subsequent applies.

## Outcome

The architecture produces a deployment where no AWS credential is stored anywhere in the CI configuration. Every secret is in Secrets Manager. The network topology prevents backend tasks from having public IPs in production. The CloudFront cache strategy eliminates cache invalidation as a deployment concern. Integration tests run against the production database engine, eliminating a class of false positives that would surface in production.

The dev/prod topology difference means the development environment costs a fraction of production but exercises the same code path. The difference in behavior between environments is encoded in Terraform variables rather than in undocumented infrastructure differences.
