---
titulo: "Módulos reutilizables en Terraform para equipos pequeños"
descripcion: "Cómo estructurar módulos Terraform que cualquier miembro del equipo pueda usar sin conocer los detalles internos."
fecha: 2026-04-15
tags: ["Terraform", "IaC", "AWS", "DevOps"]
draft: false
---

## El problema con Terraform sin módulos

Cuando empiezas con Terraform, es tentador escribir todo en un solo archivo `main.tf`. Funciona al principio — pero cuando el equipo crece o necesitas replicar la infraestructura en otro entorno, el problema aparece: código duplicado, configuraciones inconsistentes y mucho copy-paste.

La solución son los **módulos reutilizables**.

## ¿Qué es un módulo en Terraform?

Un módulo es simplemente una carpeta con archivos `.tf` que encapsula una parte de tu infraestructura. Por ejemplo, un módulo `vpc` que crea la red, subnets y NAT Gateway — sin que quien lo use necesite saber cómo está implementado por dentro.

```hcl
module "vpc" {
  source = "./modules/vpc"

  nombre    = "produccion"
  region    = "eu-west-1"
  ambiente  = "prod"
}
```

## Estructura recomendada
infra/
modules/
vpc/
main.tf
variables.tf
outputs.tf
ecs/
main.tf
variables.tf
outputs.tf
environments/
dev/
main.tf
terraform.tfvars
prod/
main.tf
terraform.tfvars
## Las tres reglas de un buen módulo

**1. Variables con valores por defecto sensatos**
No obligues a quien usa el módulo a especificar todo. Solo lo que realmente cambia entre entornos.

**2. Outputs claros**
Expón solo lo que otros módulos necesitan — el ID de la VPC, el ARN del rol, el nombre del bucket.

**3. Un módulo, una responsabilidad**
Un módulo de VPC no crea instancias EC2. Un módulo de ECS no gestiona la base de datos. Separación clara.

## Ejemplo real — módulo de Security Group

```hcl
# modules/security_group/variables.tf
variable "nombre" {
  description = "Nombre del security group"
  type        = string
}

variable "vpc_id" {
  description = "ID de la VPC donde crear el SG"
  type        = string
}

variable "puertos_entrada" {
  description = "Lista de puertos permitidos"
  type        = list(number)
  default     = [80, 443]
}
```

## Conclusión

Los módulos son la diferencia entre infraestructura que escala y infraestructura que se convierte en deuda técnica. Empieza simple — un módulo por servicio — y refactoriza cuando veas patrones repetidos.
