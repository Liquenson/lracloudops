---
titulo: "Infraestructura AWS en Producción con Terraform: EKS, RDS Multi-AZ y Doble Pipeline CI/CD"
descripcion: "Decisiones arquitectónicas para un stack Terraform modular que despliega Flask en EKS con RDS PostgreSQL 15 Multi-AZ, pipelines duales de GitHub Actions y Jenkins, y puertas de cobertura con SonarCloud. Qué cuesta cada decisión y por qué se tomó."
fecha: 2026-05-03
tags: ["Terraform", "AWS", "EKS", "Kubernetes", "IaC", "CI/CD", "Jenkins", "GitHub Actions"]
draft: false
---

## Problema

Existe una diferencia sustancial entre usar AWS y diseñar infraestructura AWS de grado productivo. Lo primero significa crear recursos desde la consola. Lo segundo significa que cada recurso está definido como código, versionado en Git, reproducible desde cero y desplegable en menos de 30 minutos en una cuenta nueva.

La brecha entre estos dos estados no es complejidad técnica — las herramientas están documentadas. La brecha está en las decisiones: qué recursos pertenecen al mismo módulo, cómo se estructuran los archivos de estado, qué puertas de calidad deben pasar antes de que el código llegue a producción, cómo difieren los entornos sin divergir.

## Contexto

La infraestructura objetivo: una aplicación Flask 3.0.3 desplegada en EKS 1.31, base de datos RDS PostgreSQL 15 Multi-AZ, red distribuida en múltiples zonas de disponibilidad, y un pipeline CI/CD doble — GitHub Actions para calidad y Jenkins para despliegue. El requisito no funcional que guía todas las decisiones: estado remoto, módulos reutilizables, sin configuración manual en producción.

## Estructura de módulos

```hcl
modules/
  networking/    # VPC, subnets, routing, NAT
  cluster/       # EKS control plane + node groups
  database/      # RDS PostgreSQL Multi-AZ
  registry/      # ECR, lifecycle policies
  storage/       # S3 state backend, DynamoDB lock
  iam/           # Roles, políticas, OIDC providers
```

Cada módulo expone una interfaz mínima de variables de entrada y una interfaz explícita de outputs. Los módulos no se referencian entre sí directamente — la composición ocurre en el nivel de entorno (`environments/dev/`, `environments/prod/`). Esto mantiene cada módulo testeable de forma aislada y evita dependencias circulares.

## Estado remoto y bloqueo

```hcl
terraform {
  backend "s3" {
    bucket         = "lracloudops-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

La tabla DynamoDB provee bloqueo optimista: solo una operación `terraform apply` puede ejecutarse simultáneamente por entorno. El cifrado en el bucket S3 protege los valores de estado sensibles (ARNs, endpoints de RDS, certificados). El archivo de estado en sí nunca se almacena localmente en pipelines CI/CD.

## EKS: decisiones del plano de control

La versión EKS 1.31 fue seleccionada por la ventana de soporte estándar de 14 meses. Los grupos de nodos gestionados usan tipos `t3.medium` en el entorno de desarrollo y `t3.large` en producción — la diferencia de tamaño refleja el comportamiento de HPA bajo carga real, no estimaciones.

El proveedor de identidad OIDC se aprovisiona como parte del módulo de clúster. Esto es un prerequisito para roles IAM de servicio (IRSA) — el mecanismo por el que los pods asumen roles IAM sin credenciales estáticas. Cualquier servicio que requiera acceso AWS (operadores de CloudWatch, drivers CSI) usa IRSA en lugar de variables de entorno con claves de acceso.

## RDS: Multi-AZ y acceso desde EKS

PostgreSQL 15 en Multi-AZ significa que la instancia primaria y la standby residen en zonas de disponibilidad separadas. El failover automático de RDS promueve la standby a primaria en 60–120 segundos sin cambios de endpoint — la aplicación reconecta al mismo nombre DNS.

El acceso desde EKS al RDS usa grupos de seguridad en lugar de rangos CIDR: el grupo de seguridad del clúster EKS se referencia directamente en las reglas de ingreso del grupo de seguridad RDS. Si los CIDRs del nodo cambian (escalado, sustitución), las reglas no necesitan actualización.

## Pipeline dual: GitHub Actions + Jenkins

**GitHub Actions** maneja la puerta de calidad: lint con flake8, tests unitarios con pytest, análisis SonarCloud con umbral de cobertura ≥ 80%, construcción y push de imagen Docker a ECR. No toca el clúster.

**Jenkins** maneja el despliegue: pull de la imagen verificada de ECR, actualización de helm values, `helm upgrade --install` contra el clúster EKS. Los pasos de calidad ocurren en Actions; Jenkins actúa sobre artefactos que ya han pasado las puertas.

Esta separación tiene una consecuencia operacional: si Jenkins falla, el artefacto verificado sigue en ECR. El despliegue puede reintentarse sin volver a ejecutar las puertas de calidad. Si Actions falla, el artefacto nunca llega a ECR — Jenkins no tiene qué desplegar.

## Lo que no está en los módulos

La configuración de alertas de CloudWatch no está en Terraform — vive en el pipeline de observabilidad y se actualiza con mayor frecuencia que la infraestructura base. Los secretos de la base de datos usan `aws_secretsmanager_secret` con rotación habilitada, pero los valores se inyectan fuera de Terraform. La rotación de certificados ACM es manejada por AWS.

Cada exclusión tiene una razón: mezclar infraestructura base con configuración operacional hace que cada `terraform plan` incluya cambios de ambos, oscureciendo qué parte del estado está cambiando realmente.
