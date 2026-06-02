---
titulo: "Módulos Terraform Reutilizables: Diseño de Interfaz y Aislamiento de Estado"
descripcion: "Cómo estructurar módulos Terraform con contratos claros de entrada/salida, aislamiento de estado entre entornos y límites de dependencias que permiten la evolución independiente de cada componente de infraestructura."
fecha: 2026-04-15
tags: ["Terraform", "IaC", "AWS", "DevOps"]
draft: false
---

## Problema

El código de infraestructura escrito sin límites de módulos converge hacia un único `main.tf` grande que provisiona todo en secuencia. Esto funciona hasta que no funciona: un cambio en la configuración del servicio ECS requiere tocar el mismo archivo que contiene el VPC, la instancia RDS y los roles IAM. El radio de explosión de cada cambio es todo el entorno.

El otro modo de fallo es la modularidad por copiar-pegar: directorios separados para dev y prod que empiezan como copias y divergen con el tiempo. El VPC de dev tiene un CIDR diferente al de prod. El RDS de prod tiene Multi-AZ habilitado pero dev no — de una forma que no fue documentada, simplemente se hizo. Reproducir un bug en dev requiere primero reconstruir cómo es prod realmente.

## Contexto

El objetivo: un conjunto de módulos Terraform reutilizables que pueden componerse en múltiples configuraciones de entorno sin copiar código. Cada módulo tiene una interfaz explícita, limites de dependencia claros y comportamiento aislado de estado.

## Estructura de módulos

```
modules/
  vpc/
    main.tf
    variables.tf    # inputs declarados
    outputs.tf      # outputs declarados
  cluster/
    main.tf
    variables.tf
    outputs.tf
  database/
    main.tf
    variables.tf
    outputs.tf

environments/
  dev/
    main.tf        # instancia los módulos
    terraform.tfvars
  prod/
    main.tf        # instancia los módulos
    terraform.tfvars
```

Los módulos son bibliotecas — definen qué recursos crean y qué parámetros aceptan. Los entornos son programas — componen los módulos con valores específicos del entorno. Esta separación permite que los módulos evolucionen sin cambiar los entornos, y que los entornos diverjan en valores sin cambiar los módulos.

## Diseño de interfaz de variables

Las variables de un módulo son su API. Variables mal diseñadas hacen que el módulo sea difícil de usar o imposible de reutilizar.

```hcl
# Mal: acepta demasiado
variable "vpc_config" {
  type = object({
    cidr                = string
    az_count            = number
    enable_nat          = bool
    public_subnet_tags  = map(string)
    private_subnet_tags = map(string)
    flow_logs_bucket    = string
    # ... 15 campos más
  })
}

# Bien: acepta exactamente lo que necesita
variable "cidr_block" {
  type        = string
  description = "CIDR block para el VPC (ej: 10.0.0.0/16)"
}

variable "availability_zones" {
  type        = list(string)
  description = "Lista de AZs donde crear subnets"
}

variable "enable_nat_gateway" {
  type        = bool
  default     = false
  description = "Crear NAT Gateway para subnets privadas (coste adicional)"
}
```

La versión "mal" requiere que el caller construya un objeto complejo incluso cuando solo necesita cambiar `cidr_block`. La versión "bien" tiene valores por defecto razonables, cada variable tiene un único propósito, y `description` documenta las implicaciones operacionales (como el coste del NAT Gateway).

## Outputs como contratos

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID del VPC para referenciar desde otros módulos"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "IDs de subnets privadas para EKS node groups y RDS"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "IDs de subnets públicas para ALB"
}
```

Los outputs son el contrato de salida del módulo. Un cambio en un output es un breaking change — requiere actualizar todos los callers. Nombrar los outputs con precisión (`private_subnet_ids` en lugar de `subnets`) evita ambigüedad cuando múltiples módulos los consumen.

## Composición de entornos

```hcl
# environments/prod/main.tf
module "vpc" {
  source             = "../../modules/vpc"
  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  enable_nat_gateway = true
}

module "cluster" {
  source             = "../../modules/cluster"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  cluster_version    = "1.31"
  node_instance_type = "t3.large"
}

module "database" {
  source          = "../../modules/database"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  instance_class  = "db.t3.medium"
  multi_az        = true
}
```

Las referencias entre módulos usan outputs — `module.vpc.vpc_id` en lugar de hardcodear un ID. Terraform resuelve las dependencias automáticamente: si `cluster` depende de outputs de `vpc`, Terraform provisiona `vpc` primero. Las dependencias son explícitas en el código, no implícitas en el orden de los archivos.

## Aislamiento de estado

Cada entorno tiene su propio archivo de estado en S3:

```hcl
# environments/dev/terraform.tf
terraform {
  backend "s3" {
    bucket = "lracloudops-tfstate"
    key    = "dev/terraform.tfstate"
  }
}

# environments/prod/terraform.tf
terraform {
  backend "s3" {
    bucket = "lracloudops-tfstate"
    key    = "prod/terraform.tfstate"
  }
}
```

El estado de dev y prod son independientes. `terraform destroy` en dev no afecta al estado de prod. Una corrupción del estado de dev (rara pero posible) no afecta a prod. Los equipos pueden trabajar en cambios de dev mientras prod está en producción sin conflictos de estado.

## Versionado de módulos

En entornos con múltiples equipos o cambios frecuentes de módulos:

```hcl
module "vpc" {
  source  = "git::https://github.com/org/terraform-modules.git//vpc?ref=v2.1.0"
  # ...
}
```

Fijar la versión del módulo con `?ref=v2.1.0` (tag de git) significa que un cambio en el módulo no afecta automáticamente a todos los entornos que lo usan. La actualización es explícita y rastreable en el historial de git del entorno.

## Lo que la modularidad no resuelve

Los módulos no eliminan la necesidad de revisar los planes de Terraform antes de aplicar. Un módulo bien diseñado con malos valores de entrada sigue creando infraestructura incorrecta. La revisión del plan es la última línea de defensa — la modularidad reduce la probabilidad de cambios no deseados pero no la elimina.
