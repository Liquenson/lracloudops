---
titulo: "TBF Cloud Infrastructure"
descripcion: "Plataforma SaaS completa con Spring Boot 4.0.3 y React 18.3.1 en AWS ECS Fargate. 11 módulos Terraform 1.9.8, OIDC puro sin credenciales estáticas, circuit breaker con rollback automático y CloudFront OAC con cache diferenciado."
fecha: 2026-05-01
categoria: "Full Stack + Cloud"
madurez: "Producción"
stack: ["Spring Boot 4.0.3", "Java 17", "React 18.3.1", "Vite 5.4.14", "Terraform 1.9.8", "AWS ECS Fargate", "CloudFront", "RDS PostgreSQL 15", "AWS Secrets Manager", "ALB", "S3", "GitHub Actions"]
cicd: true
github: null
featured: true
iconPath: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
draft: false
metricas:
  - { label: "Módulos Terraform", value: "11" }
  - { label: "Pipelines CI/CD", value: "3" }
  - { label: "Servicios AWS", value: "15+" }
  - { label: "Ambientes", value: "Dev + Prod" }
highlights:
  - "OIDC puro: tokens IAM efímeros de 15 minutos — cero AWS keys almacenadas en GitHub Secrets"
  - "ECS circuit breaker con rollback automático en deploy fallido — sin intervención manual"
  - "CloudFront OAC moderno (no OAI legacy) con cache diferenciado: assets 1 año immutable vs index.html no-cache"
  - "RDS PostgreSQL 15 Multi-AZ con deletion protection, 7 días de backups y performance insights"
  - "11 módulos Terraform: vpc, ecr, ecs_backend, rds, alb, cloudfront, s3_frontend, s3_documents, secrets_manager, nat, security_group"
  - "Separación dev/prod: dev sin NAT Gateway (reducción de costo), prod con subnets privadas y NAT"
  - "AWS Secrets Manager: rotación de credenciales sin redeploy — solo reiniciar el task de ECS"
  - "ECS Exec habilitado en dev para diagnóstico directo en contenedores sin SSH"
arquitectura:
  - { nombre: "CloudFront + S3", descripcion: "CDN global serviendo el frontend React con OAC (Origin Access Control)" }
  - { nombre: "ALB → ECS Fargate", descripcion: "Load balancer redirige tráfico a contenedores Spring Boot en Fargate" }
  - { nombre: "RDS PostgreSQL 15", descripcion: "Base de datos en subnets privadas, Multi-AZ en producción" }
  - { nombre: "AWS Secrets Manager", descripcion: "Inyección de secretos en runtime sin exponer credenciales" }
  - { nombre: "S3 Documents", descripcion: "Bucket separado para documentos de usuario con presigned URLs" }
  - { nombre: "NAT Gateway (prod)", descripcion: "Dev usa subnets públicas para reducir costos; prod usa NAT privado" }
---

## Descripción del proyecto

TBF Cloud Infrastructure es una plataforma SaaS completa que demuestra cómo construir, desplegar y operar una aplicación web moderna en AWS con todas las mejores prácticas de seguridad, escalabilidad y automatización.

El proyecto incluye backend (Spring Boot 4), frontend (React 18 + Vite) y toda la infraestructura AWS en Terraform modular, con tres pipelines independientes de CI/CD.

## Arquitectura de la plataforma

El tráfico de usuarios llega a CloudFront. Las peticiones al frontend se sirven desde S3 directamente. Las peticiones a la API (/api/*) se redirigen al ALB, que las distribuye entre los contenedores ECS Fargate ejecutando Spring Boot.

Los contenedores acceden a RDS PostgreSQL y a S3 para documentos. Los secretos (contraseña DB, JWT secret, credenciales email) se obtienen de AWS Secrets Manager en el arranque del contenedor.

## Decisiones de diseño Dev vs Prod

Una decisión deliberada es que dev y prod tienen configuraciones de infraestructura diferentes:

**Dev:** ECS tasks en subnets públicas, sin NAT Gateway (ahorra ~$35/mes), RDS sin Multi-AZ.

**Prod:** ECS en subnets privadas, NAT Gateway, RDS Multi-AZ, deletion protection habilitada, HTTPS con ACM.

Esta separación permite desarrollar y testear en un entorno económico mientras prod mantiene todos los controles de seguridad y disponibilidad.

## CI/CD con tres pipelines

**backend.yml:** Ejecuta tests Maven, construye imagen Docker, la sube a ECR y hace force-deploy del servicio ECS. Usa AWS OIDC para autenticación sin credenciales hardcodeadas.

**frontend.yml:** Build con Vite, sube artefactos a S3 y ejecuta invalidación de CloudFront para que los usuarios reciban la versión nueva inmediatamente.

**terraform.yml:** Valida y planea en PRs; aplica solo en push a main desde el workflow aprobado.

## Gestión de secretos

En entornos desplegados, ningún secreto existe en variables de entorno del repositorio ni en archivos .env. Spring Boot obtiene todos los secretos de AWS Secrets Manager al arrancar, usando el IAM role del task de ECS.

Esto significa que rotar una contraseña no requiere redesplegar la aplicación, solo actualizar el secreto en Secrets Manager y reiniciar el task.

## Lessons learned

La mayor complejidad fue el orden de creación de recursos en Terraform. El security group del ECS task necesita saber el ID del security group de RDS para la regla de egreso, pero RDS necesita el security group de ECS para su regla de ingreso. Esto crea dependencias circulares que Terraform resuelve con referencias explícitas entre módulos.

La segunda lección importante: los presigned URLs de S3 tienen tiempo de expiración. Para documentos que los usuarios acceden repetidamente, es mejor generar URLs nuevas en cada request en lugar de guardarlas en la base de datos.
