---
titulo: "Reusable Terraform Modules: Interface Design and State Isolation"
descripcion: "How to structure Terraform modules with clear input/output contracts, state isolation between environments and dependency boundaries that allow independent evolution of each infrastructure component."
fecha: 2026-04-15
tags: ["Terraform", "IaC", "AWS", "DevOps"]
draft: false
---

## Problem

Infrastructure code written without module boundaries converges toward a single large `main.tf` that provisions everything in sequence. This works until it does not: a change to the ECS service configuration requires touching the same file that contains the VPC, the RDS instance and the IAM roles. The blast radius of every change is the entire environment.

The other failure mode is copy-paste modularity: separate directories for dev and prod that start as copies and diverge over time. The dev VPC has a CIDR that differs from prod. The prod RDS has Multi-AZ enabled but dev does not — in a way that was not documented, just done. Reproducing a bug in dev requires first reconstructing what prod actually looks like.

## Context

Terraform modules solve both problems. A module is a directory of `.tf` files that encapsulates a unit of infrastructure with an explicit input interface (`variables.tf`) and an explicit output interface (`outputs.tf`). Callers configure behavior through inputs. Modules expose what other modules need through outputs. Internal implementation details stay hidden.

The result is infrastructure with the same properties well-designed software has: each component has a single responsibility, a stable interface and can evolve independently of its consumers.

## Architecture

A production Terraform repository has two layers:

```
infra/
  modules/
    vpc/          # Network foundation
    eks/          # Compute orchestration
    rds/          # Database layer
    ecr/          # Container registry
    iam/          # Identity and access
    cloudwatch/   # Observability
  environments/
    dev/
      main.tf     # Composes modules with dev-specific inputs
      terraform.tfvars
      backend.tf
    prod/
      main.tf     # Same module composition, different inputs
      terraform.tfvars
      backend.tf
```

The environments directory does not contain infrastructure definitions — it contains module invocations with environment-specific variable values. The VPC module is written once. Dev and prod both call it with different CIDRs and availability zone counts.

## Implementation

### Module structure

Each module has three files with defined responsibilities:

**`variables.tf`** — declares what the module accepts. Every variable has a description and a type. Variables without defaults are required; variables with defaults are optional configuration.

```hcl
# modules/vpc/variables.tf
variable "environment" {
  description = "Environment name used in resource tags and naming"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "enable_nat_gateway" {
  description = "Create a NAT Gateway for private subnet egress. Set false in dev to reduce cost."
  type        = bool
  default     = false
}

variable "availability_zones" {
  description = "List of AZs to create subnets in"
  type        = list(string)
}
```

**`outputs.tf`** — exposes only what downstream modules need. Not the full resource. Not every attribute. The exact identifiers and ARNs that other modules reference.

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of private subnets — used by EKS node groups and RDS"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of public subnets — used by ALB"
  value       = aws_subnet.public[*].id
}
```

**`main.tf`** — the resource definitions. No hardcoded values. All configuration flows from variables.

### Module composition in environments

The environment `main.tf` composes modules and passes outputs from one as inputs to another:

```hcl
# environments/prod/main.tf
module "vpc" {
  source             = "../../modules/vpc"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = true
}

module "eks" {
  source               = "../../modules/eks"
  environment          = var.environment
  private_subnet_ids   = module.vpc.private_subnet_ids
  vpc_id               = module.vpc.vpc_id
  eks_cluster_role_arn = module.iam.eks_cluster_role_arn
  eks_nodes_role_arn   = module.iam.eks_nodes_role_arn
  kubernetes_version   = var.kubernetes_version
  instance_type        = var.instance_type
}

module "rds" {
  source             = "../../modules/rds"
  environment        = var.environment
  private_subnet_ids = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id
  multi_az           = true
  backup_retention   = 7
  deletion_protection = true
}
```

The same modules are called in `environments/dev/main.tf` with `enable_nat_gateway = false`, `multi_az = false` and `backup_retention = 1`. The module implementation does not change. Only the configuration values differ.

### State isolation

Each environment has its own `backend.tf` pointing to a separate S3 prefix:

```hcl
# environments/prod/backend.tf
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

State isolation is not optional in team environments. Without separate state files, a `terraform apply` in dev reads and potentially modifies the same state that prod depends on. A corrupted state file becomes an incident.

DynamoDB locking prevents concurrent applies against the same state file. Without locking, two engineers running `terraform apply` simultaneously can produce a corrupted state that cannot be recovered without manual intervention.

### Dependency graph and circular references

Modules create explicit dependency relationships. IAM roles needed by EKS are defined in the IAM module and passed as inputs to the EKS module. This prevents the circular reference problem where two modules each need something from the other.

The pattern: resource dependencies should flow in one direction. Network → IAM → Compute → Data. A module at a lower layer should never accept inputs from a module at a higher layer.

## Operational Considerations

**Apply order** — the first apply of a new environment takes 30-45 minutes. EKS cluster provisioning alone takes 15-20 minutes. RDS Multi-AZ provisioning takes another 10-15 minutes. Subsequent applies that change only application configuration (image tags, task counts) take under 2 minutes because infrastructure resources are stable.

**Separating infrastructure from application changes** — a Helm chart image tag update should not run in the same `terraform apply` as a VPC CIDR expansion. Two different pipeline stages, triggered by different file path changes, keep infrastructure changes rare and deliberate while application changes stay fast.

**Module versioning** — in a multi-team environment, modules published as shared libraries should use semantic versioning. Callers pin to a specific version tag. A breaking change to a module interface increments the major version; existing callers are not affected until they explicitly upgrade.

**Validation in CI** — every pull request should run:

```bash
terraform fmt -check
terraform validate
terraform plan -detailed-exitcode
```

`-detailed-exitcode` returns exit code 2 when there are changes to apply, 0 when there are none, 1 on error. This makes it possible to fail a pull request when unexpected infrastructure changes appear in the plan.

## Outcome

A modular Terraform codebase has these properties at steady state: dev and prod use the same code paths — only variable values differ, making environment parity verifiable rather than assumed. New environments are provisioned by creating a new directory with a `terraform.tfvars` file, not by copying and editing dozens of files. Individual modules can be updated without touching unrelated infrastructure. The blast radius of a change is scoped to the modules that change touches.

Infrastructure drift — the state where the actual environment diverges from what is documented in code — becomes detectable by `terraform plan` rather than discoverable by incident.
