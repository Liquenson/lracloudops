---
titulo: "Terraform modular: un patrón de arquitectura para 6 proyectos"
descripcion: "La estructura de módulos Terraform que usamos en todos los proyectos lra-cloud-ops. VPC, EKS, RDS, IAM como módulos independientes. Estado remoto en S3 con bloqueo DynamoDB. Cómo el mismo patrón escala de un solo proyecto a una flota."
fecha: 2026-06-01
tags: ["Terraform", "AWS", "IaC", "EKS", "DevOps"]
draft: false
---

## Por qué módulos en lugar de Terraform monolítico

La configuración de Terraform más simple es un único `main.tf` que declara cada recurso en secuencia: VPC, subnets, security groups, cluster EKS, node groups, instancia RDS, roles IAM. Esto funciona para el despliegue inicial. Deja de funcionar la primera vez que necesitas cambiar algo.

El radio de explosión de cada cambio es todo el entorno. Una modificación a la configuración del node group de EKS requiere un plan que toca el módulo VPC, el módulo RDS y todos los recursos IAM — aunque ninguno de ellos haya cambiado. El diff es ilegible. La revisión es imposible. La confianza es baja.

Los límites de módulos resuelven esto. Cada módulo posee una preocupación de infraestructura específica, tiene una interfaz definida (variables de entrada, valores de salida) y puede planificarse y aplicarse de forma independiente. Un cambio a la configuración de EKS produce un plan que solo toca recursos EKS. Los recursos VPC y RDS no están en el plan porque no están en el módulo que se está modificando.

Los proyectos de lra-cloud-ops usan esta estructura de módulos de forma consistente. El mismo patrón aparece en aws-terraform-devops, gitops-stack y cualquier proyecto que aprovisiona infraestructura AWS. Aprenderlo una vez significa entender todos ellos.

## Estructura real de módulos

```
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── iam/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── ecr/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   └── terraform.tfvars
│   └── prod/
│       └── terraform.tfvars
├── main.tf        ← composición de módulos
├── variables.tf
├── outputs.tf
└── backend.tf
```

El `main.tf` de nivel superior es la capa de composición. Llama a cada módulo y pasa los outputs de un módulo como inputs del siguiente. El módulo VPC produce IDs de subnets y el ID de la VPC; el módulo EKS los toma como inputs. Las dependencias son explícitas y trazables.

```hcl
# terraform/modules/eks/main.tf
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = var.enable_public_endpoint
    security_group_ids      = [aws_security_group.cluster.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_iam_role_policy_attachment.vpc_resource_controller,
  ]
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-ng"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = var.desired_nodes
    min_size     = var.min_nodes
    max_size     = var.max_nodes
  }

  instance_types = [var.node_instance_type]
}
```

El módulo no sabe en qué VPC está hasta runtime. Recibe los IDs de subnets como variable de entrada. Este es el contrato: el módulo requiere que existan IDs de subnets; no le importa cómo fueron creadas.

## Estado remoto en S3 + bloqueo DynamoDB

El estado de Terraform local es incompatible con entornos de equipo. Dos ingenieros ejecutando `terraform apply` simultáneamente contra archivos de estado locales producen corrupción de estado. El segundo apply sobreescribe el primero y Terraform pierde el rastro de lo que realmente fue creado.

El estado remoto en S3 con bloqueo DynamoDB evita esto. El archivo de estado vive en S3. Antes de cualquier operación que modifique el estado, Terraform adquiere un bloqueo escribiendo en una tabla DynamoDB. Una segunda operación concurrente no puede adquirir el bloqueo y falla con un error informativo.

```hcl
# terraform/backend.tf
terraform {
  backend "s3" {
    bucket         = "lra-cloud-ops-tfstate"
    key            = "aws-terraform-devops/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "lra-cloud-ops-tfstate-lock"
    encrypt        = true
  }
}
```

La ruta `key` es el elemento crítico. Cada proyecto y cada entorno usa una clave diferente. El entorno dev de aws-terraform-devops usa `aws-terraform-devops/dev/terraform.tfstate`. Producción usa `aws-terraform-devops/prod/terraform.tfstate`. Los archivos de estado no pueden fusionarse accidentalmente.

El bucket de S3 tiene versioning habilitado. Si un archivo de estado se corrompe o un apply produce un resultado inesperado, el estado anterior puede recuperarse del historial de S3.

## OIDC en GitHub Actions — zero static credentials

El enfoque tradicional para el acceso AWS desde GitHub Actions era almacenar `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` como secretos de GitHub. Estas son credenciales de larga duración. Si se comprometen — a través de una brecha en el repositorio, un secreto accidentalmente registrado en la salida de CI o un ingeniero que reutiliza credenciales entre servicios — proporcionan acceso AWS persistente hasta que se roten manualmente.

La federación OIDC (OpenID Connect) elimina las credenciales de larga duración. El proveedor OIDC de GitHub emite un token de corta duración para cada ejecución de workflow. AWS verifica el token y emite credenciales temporales con alcance a un rol IAM específico. Las credenciales expiran cuando el workflow termina.

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
  pull_request:

permissions:
  id-token: write   # requerido para OIDC
  contents: read

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configurar credenciales AWS vía OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -var-file=environments/prod/terraform.tfvars

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve -var-file=environments/prod/terraform.tfvars
```

El rol IAM que asume GitHub está configurado para confiar solo en el proveedor OIDC de GitHub y solo para el repositorio específico:

```hcl
resource "aws_iam_role" "github_actions" {
  name = "github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:lra-cloud-ops/aws-terraform-devops:*"
        }
      }
    }]
  })
}
```

La condición `StringLike` restringe la confianza a un único repositorio. Un token comprometido de un repositorio diferente no puede asumir este rol.

## Gate de cobertura SonarCloud

El código de infraestructura tiene tests. El proyecto aws-terraform-devops usa pytest con moto (librería mock de AWS) para probar la aplicación Flask, y SonarCloud para aplicar un umbral mínimo de cobertura antes de cualquier merge a main.

El gate de cobertura está configurado en el workflow de GitHub Actions:

```yaml
- name: Ejecutar tests con cobertura
  run: pytest scripts/tests/ docker/src/tests/ --cov --cov-report=xml --cov-fail-under=80

- name: Análisis SonarCloud
  uses: SonarSource/sonarcloud-github-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

El flag `--cov-fail-under=80` hace que pytest salga con un código de estado no cero si la cobertura cae por debajo del 80%. El workflow falla. La acción de SonarCloud no se ejecuta. El merge queda bloqueado.

## Dual CI/CD: GitHub Actions para cloud, Jenkins para on-premise

Algunos entornos no pueden usar GitHub Actions. Redes air-gapped, proxies corporativos e infraestructura on-premise frecuentemente requieren un sistema CI autohospedado. Jenkins es la respuesta para gitops-stack, que corre en EKS pero necesita un pipeline CI que pueda ejecutarse en cualquier lugar.

Los dos pipelines son complementarios:

| Aspecto | GitHub Actions | Jenkins |
|---|---|---|
| Trigger | git push / pull request | git push (webhook) |
| Auth | Federación OIDC | Rol IAM en EC2 |
| Entorno de build | Runner alojado en GitHub | Agente Jenkins en EKS |
| Terraform | validate + plan + apply | validate + plan (apply vía Actions) |
| Docker build | nativo | Docker-in-Docker |

Ambos pipelines producen el mismo artefacto: una imagen de contenedor en ECR etiquetada con el SHA del commit. Ambos validan Terraform antes de cualquier apply. La redundancia es intencional — si GitHub Actions no está disponible, Jenkins puede ejecutar el pipeline igualmente.

## El patrón escala

La estructura de módulos descrita aquí escala de un único proyecto a una flota. Cada nuevo proyecto crea una nueva clave S3 para su estado. Cada entorno obtiene su propio archivo `.tfvars`. Cada proyecto compone los mismos módulos con diferentes valores de variables.

El proyecto aws-terraform-devops usa los módulos VPC + EKS + RDS + ECR. El proyecto gitops-stack usa los módulos VPC + EKS + IAM + ECR. Los módulos no se copian — se referencian. Una corrección de bug en el módulo VPC es un único cambio que beneficia a todos los proyectos que lo usan.

Esto no es abstracción prematura. Es el resultado natural de infraestructura que fue diseñada para operar a escala en lugar de desplegarse una vez y olvidarse.

## Ver el proyecto completo

La configuración completa de Terraform — todos los módulos, variables de entorno, workflows de CI/CD y configuración de backend — está en [github.com/lra-cloud-ops/aws-terraform-devops](https://github.com/lra-cloud-ops/aws-terraform-devops).

Para el caso de uso completo incluyendo métricas de producción y decisiones de arquitectura, consulta la [página del proyecto aws-terraform-devops](/projects/aws-terraform-devops). Para la solución de modernización AWS que usamos con clientes, consulta [Modernización AWS](/solutions/aws-modernization).
