---
titulo: "Terraform Modular en AWS: La Guía Definitiva para Producción"
descripcion: "Cómo estructurar Terraform modular en AWS con remote state en S3, DynamoDB locking, workspaces DEV/PROD y CI/CD con GitHub Actions."
fecha: 2026-06-20
tags: ["Terraform", "AWS", "IaC", "DevOps", "Infrastructure"]
draft: false
---

## Por qué Terraform modular en lugar de monolítico

Un `main.tf` de 3.000 líneas funciona. Hasta que deja de funcionar.

El Terraform monolítico tiene problemas predecibles en producción:

- **Blast radius total**: un `terraform apply` mal ejecutado puede afectar toda la infraestructura. Con módulos, aplicas solo lo que necesitas.
- **Reusabilidad cero**: cada proyecto repite la misma VPC, el mismo EKS, los mismos grupos de seguridad — pero con ligeras variaciones imposibles de mantener en sincronía.
- **Onboarding lento**: un nuevo ingeniero que ve 3.000 líneas de Terraform tarda semanas en entender qué hace qué. Módulos bien nombrados son documentación ejecutable.
- **CI/CD difícil**: los pipelines que ejecutan `plan` sobre todo el estado tardan 10 minutos aunque solo cambies una tag en una instancia EC2.

La alternativa es una estructura modular donde cada módulo tiene una responsabilidad única, inputs y outputs bien definidos, y puede ser testeado de forma independiente.

## Estructura de directorios recomendada

```
infrastructure/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── node_groups.tf
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── security_groups/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── iam/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── prod/
│       ├── main.tf
│       ├── terraform.tfvars
│       └── backend.tf
└── bootstrap/
    ├── main.tf           # S3 bucket + DynamoDB para state
    └── variables.tf
```

Cada entorno (`dev`, `prod`) es el punto de entrada que llama a los módulos con los valores apropiados. Los módulos no saben si están siendo usados en `dev` o `prod` — esa decisión está en el entorno.

## Módulo VPC con código real

```hcl
# modules/vpc/variables.tf
variable "vpc_cidr" {
  type        = string
  description = "CIDR block para la VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "Lista de AZs donde desplegar subredes"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDRs para subredes privadas (una por AZ)"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDRs para subredes públicas (una por AZ)"
}

variable "environment" {
  type        = string
  description = "Identificador de entorno: dev, staging, prod"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags adicionales a aplicar a todos los recursos"
}
```

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name                              = "${var.environment}-private-${var.availability_zones[count.index]}"
    "kubernetes.io/role/internal-elb" = "1"
    Environment                       = var.environment
  })
}

resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name                     = "${var.environment}-public-${var.availability_zones[count.index]}"
    "kubernetes.io/role/elb" = "1"
    Environment              = var.environment
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name        = "${var.environment}-igw"
    Environment = var.environment
  })
}
```

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID de la VPC creada"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "IDs de las subredes privadas"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "IDs de las subredes públicas"
}
```

## Módulo EKS que referencia la VPC

```hcl
# environments/prod/main.tf
module "vpc" {
  source = "../../modules/vpc"

  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
  environment          = var.environment
  tags                 = local.common_tags
}

module "eks" {
  source = "../../modules/eks"

  cluster_name       = "${var.environment}-eks"
  kubernetes_version = var.kubernetes_version
  vpc_id             = module.vpc.vpc_id            # output del módulo VPC
  subnet_ids         = module.vpc.private_subnet_ids # subredes privadas para los nodos
  environment        = var.environment
  tags               = local.common_tags
}
```

Los outputs del módulo VPC se convierten en inputs del módulo EKS. No hay strings hardcodeados de IDs de recursos. Terraform gestiona las dependencias automáticamente.

## Remote state en S3 + DynamoDB locking

El estado local (`terraform.tfstate`) es un antipatrón en producción:

- No es compartido entre miembros del equipo
- No tiene locking: dos `terraform apply` simultáneos corrompen el estado
- Si se borra el archivo, la infraestructura queda huérfana

La solución es un backend remoto en S3 con DynamoDB para locking:

```hcl
# bootstrap/main.tf
resource "aws_s3_bucket" "terraform_state" {
  bucket = "lracloudops-terraform-state"

  lifecycle {
    prevent_destroy = true  # nunca borrar este bucket
  }

  tags = {
    Name      = "Terraform State"
    ManagedBy = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state_encryption" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "lracloudops-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

```hcl
# environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket         = "lracloudops-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "lracloudops-terraform-locks"
    encrypt        = true
  }
}
```

```hcl
# environments/dev/backend.tf
terraform {
  backend "s3" {
    bucket         = "lracloudops-terraform-state"
    key            = "dev/terraform.tfstate"   # key diferente al de prod
    region         = "us-east-1"
    dynamodb_table = "lracloudops-terraform-locks"
    encrypt        = true
  }
}
```

## DEV/PROD workspaces con tfvars separados

```hcl
# environments/dev/terraform.tfvars
environment          = "dev"
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]
kubernetes_version   = "1.30"
node_instance_type   = "t3.medium"
node_min_count       = 1
node_max_count       = 3
```

```hcl
# environments/prod/terraform.tfvars
environment          = "prod"
vpc_cidr             = "172.16.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnet_cidrs = ["172.16.1.0/24", "172.16.2.0/24", "172.16.3.0/24"]
public_subnet_cidrs  = ["172.16.101.0/24", "172.16.102.0/24", "172.16.103.0/24"]
kubernetes_version   = "1.30"
node_instance_type   = "m5.large"
node_min_count       = 3
node_max_count       = 10
```

## GitHub Actions CI/CD: plan en PR, apply en merge

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']
  pull_request:
    branches: [main]
    paths: ['infrastructure/**']

env:
  TF_VERSION: '1.9.8'
  AWS_REGION: 'us-east-1'

jobs:
  terraform-plan:
    name: Plan (${{ matrix.environment }})
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    strategy:
      matrix:
        environment: [dev, prod]

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TERRAFORM_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Init
        working-directory: infrastructure/environments/${{ matrix.environment }}
        run: terraform init

      - name: Terraform Plan
        working-directory: infrastructure/environments/${{ matrix.environment }}
        run: terraform plan -var-file=terraform.tfvars -no-color -out=tfplan

      - name: Comment plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = `### Terraform Plan - ${{ matrix.environment }}
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

  terraform-apply:
    name: Apply (${{ matrix.environment }})
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    strategy:
      matrix:
        environment: [dev]  # solo dev en auto-apply; prod requiere aprobación manual

    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TERRAFORM_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
      - name: Terraform Init
        working-directory: infrastructure/environments/${{ matrix.environment }}
        run: terraform init
      - name: Terraform Apply
        working-directory: infrastructure/environments/${{ matrix.environment }}
        run: terraform apply -var-file=terraform.tfvars -auto-approve
```

## 5 mejores prácticas de Terraform en producción

### 1. Versiona los módulos con Git tags

```hcl
module "vpc" {
  source = "git::https://github.com/lra-cloud-ops/terraform-modules.git//vpc?ref=v2.1.0"
}
```

Nunca uses `ref=main` en producción. Un cambio en el módulo `main` puede romper todos los entornos simultáneamente.

### 2. Usa `prevent_destroy` en recursos críticos

```hcl
resource "aws_rds_cluster" "main" {
  lifecycle {
    prevent_destroy = true
  }
}
```

### 3. Implementa validaciones en los módulos

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "El entorno debe ser dev, staging o prod."
  }
}
```

### 4. Escanea con Checkov antes de aplicar

```bash
checkov -d infrastructure/environments/prod --framework terraform
```

Integra Checkov en el pipeline de CI para bloquear misconfigurations de seguridad antes del `apply`.

### 5. Documenta outputs críticos con `description`

```hcl
output "database_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "Endpoint de conexión a la base de datos RDS. Usar solo desde subredes privadas."
  sensitive   = false
}
```

## Conclusión

La arquitectura modular en Terraform no es complejidad innecesaria — es la diferencia entre infraestructura que escala con el equipo y infraestructura que frena al equipo. Un módulo bien diseñado es un contrato: acepta inputs definidos, produce outputs predecibles y oculta la complejidad de implementación.

El estado remoto con S3 + DynamoDB es obligatorio desde el primer día si hay más de una persona tocando la infraestructura. El coste es mínimo; el coste de una corrupción de estado en producción es elevado.

¿Necesitas ayuda para migrar tu infraestructura monolítica a una arquitectura modular? [Ver nuestros proyectos](/proyectos) para ver ejemplos reales.
