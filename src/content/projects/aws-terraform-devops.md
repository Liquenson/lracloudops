---
titulo: "AWS Terraform DevOps"
descripcion: "Infraestructura AWS production-ready con cluster EKS 1.31, HPA (CPU 70%), RDS PostgreSQL 15 Multi-AZ y 6 módulos Terraform. Pipeline dual GitHub Actions + Jenkins con SonarCloud, cobertura ≥80% y CloudWatch alarms proactivas."
fecha: 2026-05-01
categoria: "Cloud & IaC"
madurez: "Producción"
stack: ["Flask 3.0.3", "Python 3.11", "Terraform 1.9.8", "AWS EKS 1.31", "RDS PostgreSQL 15", "ECR", "Docker", "GitHub Actions", "Jenkins", "Helm", "Gunicorn", "SonarCloud", "CloudWatch"]
cicd: true
github: "https://github.com/Liquenson/aws-terraform-devops"
featured: true
iconPath: "M3 15a4 4 0 004 4h10a4 4 0 001-7.9A5 5 0 106 6.6"
draft: false
metricas:
  - { label: "Módulos Terraform", value: "6" }
  - { label: "Tests totales", value: "17 (8 Flask + 9 infra)" }
  - { label: "Pipelines", value: "2 paralelos" }
  - { label: "Ambientes", value: "Dev + Prod" }
highlights:
  - "Terraform 100% modular: 6 módulos (vpc, eks, rds, ecr, iam, cloudwatch) con state S3 + DynamoDB locking + SSE-S3"
  - "EKS 1.31 con HPA (CPU threshold 70%), rolling update maxUnavailable=0 y resource limits"
  - "RDS PostgreSQL 15 Multi-AZ con failover automático, backups 7 días y security groups estrictos"
  - "CloudWatch alarms proactivas: CPU>80%, Memory>85%, retención de logs 30 días"
  - "17 tests: 8 Flask (100% cobertura endpoints) + 9 tests de infra con mocks boto3"
  - "Dockerfile multi-stage, usuario non-root y automountServiceAccountToken: false"
  - "SonarCloud integrado con umbral de cobertura ≥80% como gate de calidad"
  - "Pipeline dual: GitHub Actions + Jenkins en paralelo con misma lógica build-test-deploy"
arquitectura:
  - { nombre: "VPC Multi-AZ", descripcion: "6 módulos Terraform con state remoto en S3, DynamoDB locking y SSE-S3 encryption" }
  - { nombre: "AWS EKS 1.31", descripcion: "Cluster Kubernetes gestionado con HPA (CPU 70%) y rolling update maxUnavailable=0" }
  - { nombre: "RDS PostgreSQL 15 Multi-AZ", descripcion: "Base de datos en subnets privadas con réplica standby, failover automático y 7 días de backups" }
  - { nombre: "ALB + Target Groups", descripcion: "Load balancer de capa 7 con health checks y SSL termination" }
  - { nombre: "ECR + CloudWatch", descripcion: "Registro privado de imágenes con lifecycle policies y alarms CPU>80% / Memory>85%" }
  - { nombre: "IAM Roles + OIDC", descripcion: "Autenticación sin credenciales hardcodeadas via GitHub OIDC" }
---

## Descripción del proyecto

AWS Terraform DevOps es un proyecto de infraestructura cloud production-ready que demuestra cómo construir y operar un stack AWS completo usando Infrastructure as Code, CI/CD y Kubernetes. El stack real incluye Flask 3.0.3 + Gunicorn sobre EKS 1.31, 6 módulos Terraform con state remoto en S3 + DynamoDB locking + SSE-S3 encryption, y un pipeline dual GitHub Actions + Jenkins.

El proyecto nació de la necesidad de tener un ejemplo real y funcional que combinara todas las piezas del stack DevOps moderno: infraestructura como código, containerización, orquestación, pipelines automatizados y análisis de calidad.

## El problema que resuelve

Muchos tutoriales de AWS muestran cómo desplegar un recurso individual. Este proyecto demuestra cómo funciona todo el sistema junto:

- Infraestructura definida como código y versionada en Git
- Aplicación containerizada con tests y análisis de calidad obligatorios
- Despliegue automático sin intervención humana
- Múltiples ambientes (dev/prod) con configuración separada

## Arquitectura técnica

La aplicación Flask (Python + Gunicorn) se ejecuta en pods de Kubernetes sobre EKS. El tráfico llega via ALB, pasa por los target groups y llega a los pods con autoscaling configurado.

La base de datos RDS PostgreSQL 15 está en subnets privadas, accesible solo desde el cluster EKS mediante security groups estrictos. Los backups automáticos retienen 7 días de historia.

Todo el código de infraestructura está en Terraform modular: 6 módulos separados para vpc, eks, rds, ecr, iam y cloudwatch. El state se almacena en S3 con locking via DynamoDB y SSE-S3 encryption. CloudWatch alarms cubren CPU>80%, Memory>85% y logs con retención de 30 días.

## Pipeline CI/CD

El pipeline tiene dos implementaciones paralelas:

**GitHub Actions** maneja el build, tests, análisis SonarCloud, push a ECR y despliegue via Helm cuando se hace push a main.

**Jenkins** (Jenkinsfile) implementa el mismo pipeline con capacidad de ejecutarse en infraestructura propia, útil para entornos con restricciones de red.

Ambos pipelines verifican cobertura de tests ≥80% antes de permitir el despliegue.

## Decisiones técnicas

**¿Por qué módulos Terraform en lugar de monolito?**
Con módulos, se puede reutilizar la configuración de VPC entre proyectos y actualizar EKS sin tocar la base de datos. Los 6 módulos (vpc, eks, rds, ecr, iam, cloudwatch) tienen outputs bien definidos que exponen solo los valores necesarios.

**¿Por qué Jenkins además de GitHub Actions?**
Para demostrar que la lógica del pipeline no depende de la plataforma. Los principios son los mismos: build → test → push → deploy.

**¿Por qué RDS PostgreSQL y no Aurora?**
El proyecto prioriza demostrar conceptos de IaC y CI/CD. RDS PostgreSQL 15 es más predecible para un lab y los conceptos (Multi-AZ, failover, backups) son transferibles a Aurora si el volumen lo justifica.

## Estado actual y mejoras en progreso

El proyecto tiene madurez de producción en la infraestructura Terraform y tests, pero hay dos áreas en corrección activa:

- **Jenkinsfile**: actualmente usa plugins Maven en un proyecto Python — se está migrando a la misma lógica de GitHub Actions con pip y pytest
- **GitHub Actions**: el job de Docker build/push está en progreso para cerrar la paridad con el pipeline Jenkins
- **EKS versiones**: dev usa 1.31 y prod 1.29 — se está alineando a 1.31 en ambos ambientes

## Lessons learned

La mayor lección fue que el tiempo de plan de Terraform no refleja el tiempo de apply. Algunos recursos como el cluster EKS pueden tardar 15-20 minutos en crearse, lo que afecta los tiempos de pipeline en el primer deploy.

Solución: separar el apply de infraestructura base (VPC, EKS, RDS) del deploy de aplicación. La infraestructura se aplica raramente; la aplicación se despliega frecuentemente.
