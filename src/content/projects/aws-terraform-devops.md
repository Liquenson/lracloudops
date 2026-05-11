---
titulo: "AWS Terraform DevOps"
descripcion: "Infraestructura AWS production-ready con cluster EKS, autoscaling horizontal y RDS MySQL Multi-AZ gestionados 100% con Terraform modular. Pipeline completo con SonarCloud, cobertura ≥80% y despliegue automático via Helm. Incluye Jenkins + GitHub Actions en paralelo."
fecha: 2026-05-01
categoria: "Cloud & IaC"
madurez: "Producción"
stack: ["Terraform", "AWS EKS", "RDS MySQL", "Docker", "GitHub Actions", "Jenkins", "Helm", "SonarCloud", "Flask", "Python", "Gunicorn"]
cicd: true
github: "https://github.com/Liquenson/aws-terraform-devops"
featured: true
iconPath: "M3 15a4 4 0 004 4h10a4 4 0 001-7.9A5 5 0 106 6.6"
draft: false
metricas:
  - { label: "Recursos IaC", value: "12+" }
  - { label: "Cobertura tests", value: "≥80%" }
  - { label: "Pipelines", value: "2 paralelos" }
  - { label: "Ambientes", value: "Dev + Prod" }
highlights:
  - "EKS cluster con autoscaling horizontal (HPA) configurado para carga variable"
  - "RDS MySQL Multi-AZ con failover automático y backups automáticos"
  - "Terraform 100% modular con state remoto en S3 y DynamoDB para locking"
  - "Pipeline dual: GitHub Actions + Jenkins en paralelo"
  - "Análisis de calidad con SonarCloud y umbral de cobertura ≥80%"
  - "Despliegue via Helm con rollback automático en caso de fallo"
arquitectura:
  - { nombre: "VPC Multi-AZ", descripcion: "Subnets públicas y privadas en 2 zonas de disponibilidad con NAT Gateway" }
  - { nombre: "AWS EKS", descripcion: "Cluster Kubernetes gestionado con nodos EC2 y autoscaling horizontal" }
  - { nombre: "RDS MySQL Multi-AZ", descripcion: "Base de datos con réplica en standby y failover automático" }
  - { nombre: "ALB + Target Groups", descripcion: "Load balancer de capa 7 con health checks y SSL termination" }
  - { nombre: "ECR", descripcion: "Registro privado de imágenes Docker con lifecycle policies" }
  - { nombre: "IAM Roles + OIDC", descripcion: "Autenticación sin credenciales hardcodeadas via GitHub OIDC" }
---

## Descripción del proyecto

AWS Terraform DevOps es un proyecto de infraestructura cloud production-ready que demuestra cómo construir y operar un stack AWS completo usando Infrastructure as Code, CI/CD y Kubernetes.

El proyecto nació de la necesidad de tener un ejemplo real y funcional que combinara todas las piezas del stack DevOps moderno: infraestructura como código, containerización, orquestación, pipelines automatizados y análisis de calidad.

## El problema que resuelve

Muchos tutoriales de AWS muestran cómo desplegar un recurso individual. Este proyecto demuestra cómo funciona todo el sistema junto:

- Infraestructura definida como código y versionada en Git
- Aplicación containerizada con tests y análisis de calidad obligatorios
- Despliegue automático sin intervención humana
- Múltiples ambientes (dev/prod) con configuración separada

## Arquitectura técnica

La aplicación Flask (Python + Gunicorn) se ejecuta en pods de Kubernetes sobre EKS. El tráfico llega via ALB, pasa por los target groups y llega a los pods con autoscaling configurado.

La base de datos RDS MySQL está en subnets privadas, accesible solo desde el cluster EKS mediante security groups estrictos. Los backups automáticos retienen 7 días de historia.

Todo el código de infraestructura está en Terraform modular: módulos separados para VPC, EKS, RDS, ECR y IAM. El state se almacena en S3 con locking via DynamoDB.

## Pipeline CI/CD

El pipeline tiene dos implementaciones paralelas:

**GitHub Actions** maneja el build, tests, análisis SonarCloud, push a ECR y despliegue via Helm cuando se hace push a main.

**Jenkins** (Jenkinsfile) implementa el mismo pipeline con capacidad de ejecutarse en infraestructura propia, útil para entornos con restricciones de red.

Ambos pipelines verifican cobertura de tests ≥80% antes de permitir el despliegue.

## Decisiones técnicas

**¿Por qué módulos Terraform en lugar de monolito?**
Con módulos, se puede reutilizar la configuración de VPC entre proyectos y actualizar EKS sin tocar la base de datos.

**¿Por qué Jenkins además de GitHub Actions?**
Para demostrar que la lógica del pipeline no depende de la plataforma. Los principios son los mismos.

**¿Por qué RDS y no Aurora?**
El proyecto prioriza demostrar conceptos de IaC y CI/CD. RDS MySQL es más predecible para un lab y los conceptos (Multi-AZ, failover, backups) son transferibles.

## Lessons learned

La mayor lección fue que el tiempo de plan de Terraform no refleja el tiempo de apply. Algunos recursos como el cluster EKS pueden tardar 15-20 minutos en crearse, lo que afecta los tiempos de pipeline en el primer deploy.

Solución: separar el apply de infraestructura base (VPC, EKS, RDS) del deploy de aplicación. La infraestructura se aplica raramente; la aplicación se despliega frecuentemente.
