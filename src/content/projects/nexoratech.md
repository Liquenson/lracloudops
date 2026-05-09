---
titulo: "NexoraTech"
descripcion: "Plataforma SaaS cloud-native enterprise con Spring Boot 4.0.3, React 18 y AWS ECS Fargate. Arquitectura full-stack production-ready con autenticación JWT + MFA (TOTP), Terraform modular en 10 módulos, pipelines CI/CD sin credenciales via OIDC y entrega global via CloudFront."
fecha: 2026-04-01
categoria: "Full-Stack & Cloud"
madurez: "Producción"
stack: ["Spring Boot 4.0.3", "Java 17", "React 18", "Vite", "Zustand", "PostgreSQL 15", "Terraform", "AWS ECS Fargate", "CloudFront", "S3", "RDS", "Docker", "GitHub Actions", "AWS Secrets Manager", "Flyway", "MapStruct"]
cicd: true
github: null
featured: false
iconPath: "M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z"
draft: false
metricas:
  - { label: "Módulos Terraform", value: "10" }
  - { label: "Ambientes", value: "Dev / Staging / Prod" }
  - { label: "Pipelines CI/CD", value: "3 paralelos" }
  - { label: "Capas de seguridad", value: "JWT + MFA + OIDC" }
highlights:
  - "Spring Boot 4.0.3 + Java 17: autenticación stateless con JWT y MFA TOTP con bloqueo de cuenta por intentos fallidos"
  - "Terraform 100% modular: 10 módulos independientes (VPC, ECS, RDS, ALB, CloudFront, S3, Secrets Manager, ECR, Security Groups)"
  - "OIDC federation: GitHub Actions asume roles IAM sin credenciales de larga duración en ningún secreto del repositorio"
  - "CloudFront + S3: entrega global del frontend React con estrategia de cache diferenciada (assets 1 año, index.html sin cache)"
  - "Dev vs Prod: dev usa subnets públicas sin NAT para reducir costos; prod usa subnets privadas con NAT Gateway, RDS Multi-AZ y deletion protection"
  - "AWS Secrets Manager: credenciales de DB, JWT y SMTP inyectadas en tiempo de ejecución en el task definition de ECS — nunca en código ni imágenes"
  - "AI DevOps Agent (agent.py): agente conversacional con Claude + Boto3 que consulta y gestiona más de 30 servicios AWS en lenguaje natural"
  - "Flyway + Testcontainers: migraciones de esquema versionadas y tests de integración contra PostgreSQL real, no mocks"
arquitectura:
  - { nombre: "React 18 + CloudFront", descripcion: "SPA servida desde S3 privado via CloudFront OAC con cache agresivo para assets hasheados e invalidación automática en cada deploy" }
  - { nombre: "Spring Boot 4 en ECS Fargate", descripcion: "Backend serverless en contenedores sin EC2 que gestionar. Dev: 1 tarea pública; Prod: 2 tareas en subnets privadas con NAT" }
  - { nombre: "RDS PostgreSQL 15", descripcion: "Base de datos gestionada con cifrado en reposo, backups automáticos (7 días en prod), Multi-AZ con failover automático y performance insights" }
  - { nombre: "AWS Secrets Manager", descripcion: "Secretos de DB, JWT y SMTP almacenados y rotados en Secrets Manager. Inyectados como variables de entorno en el task definition de ECS" }
  - { nombre: "Terraform Modular (10 módulos)", descripcion: "VPC, Security Groups, ECR, RDS, Secrets, ALB, ECS, S3 Frontend, S3 Documents y CloudFront. Cada módulo es independiente y reutilizable" }
  - { nombre: "GitHub Actions + OIDC", descripcion: "Tres pipelines: backend (Maven → ECR → ECS), frontend (Vite → S3 → CloudFront) e infraestructura (Terraform plan/apply). Sin credenciales hardcodeadas" }
  - { nombre: "JWT + MFA TOTP", descripcion: "Autenticación stateless con JJWT 0.12.6. MFA opcional con TOTP, QR code de setup y bloqueo de cuenta por intentos fallidos consecutivos" }
  - { nombre: "AI DevOps Agent", descripcion: "Agente Python con Claude API y Boto3 que consulta EC2, ECS, RDS, CloudFront, IAM, Cost Explorer y más de 30 servicios AWS mediante lenguaje natural en español" }
---

## Descripción del proyecto

NexoraTech es una plataforma SaaS cloud-native enterprise que demuestra cómo construir, desplegar y operar un sistema full-stack production-ready sobre AWS desde cero.

El proyecto cubre todas las capas del stack moderno: autenticación segura en el backend, interfaz React con internacionalización y gestión de estado, infraestructura completa como código en Terraform, y tres pipelines de CI/CD automatizados que no usan credenciales de larga duración en ningún punto del proceso.

## El problema que resuelve

Construir una plataforma SaaS real no es solo escribir código de aplicación. Hay decisiones de arquitectura que impactan el costo, la seguridad y la mantenibilidad a largo plazo, y muchos ejemplos online las omiten o simplifican en exceso.

NexoraTech responde a preguntas concretas:

- ¿Cómo se estructuran los módulos Terraform para que sean reutilizables sin acoplarse?
- ¿Cómo se manejan los secretos de forma que nunca aparezcan en código, imágenes Docker ni logs?
- ¿Cómo se diferencia la infraestructura entre dev y prod de forma coherente sin duplicar código?
- ¿Cómo se implementa MFA sin acoplar la lógica de autenticación al resto del sistema?

## Arquitectura técnica

El tráfico sigue el camino: `CloudFront → S3` para el frontend estático, y `CloudFront (o directo) → ALB → ECS Fargate → RDS` para el backend.

```
Usuarios ──► Route53 ──► CloudFront ──► S3 (React SPA)
                    │
                    └──► ALB ──► ECS Fargate (Spring Boot :8080)
                                     └──► RDS PostgreSQL 15
                                     └──► Secrets Manager
                                     └──► S3 Documents
```

**Separación dev/prod:** El ambiente de desarrollo usa subnets públicas para los tasks de ECS (sin NAT Gateway, sin costo adicional) y una instancia RDS `db.t3.micro` en una sola zona sin backups. Producción usa subnets privadas con NAT Gateway, RDS `db.t3.small` Multi-AZ con 7 días de backups, deletion protection, y performance insights habilitados.

Esta separación no es solo de configuración — está diseñada en los módulos Terraform con variables que cambian el comportamiento completo: topología de red, tamaño de recursos, políticas de backup y niveles de protección.

## Backend: Spring Boot 4 + JWT + MFA

El backend es una API REST stateless con autenticación JWT usando JJWT 0.12.6. Cada request lleva el token en el header; no hay sesiones en servidor.

El módulo de seguridad está aislado en `infrastructure/security/` con `JwtService`, `JwtFilter` y `SecurityConfig`. La autenticación no depende de lógica de negocio.

**MFA TOTP** se implementa con códigos temporales compatibles con Google Authenticator. El flujo completo:

1. El usuario activa MFA y recibe un QR code para registrar la app autenticadora
2. En cada login, después de validar password, el backend verifica el código TOTP
3. Más de N intentos fallidos consecutivos bloquea la cuenta hasta una fecha calculada

El frontend React muestra el componente `OtpInput` para ingresar el código de 6 dígitos.

## Frontend: React 18 + Zustand + i18next

La SPA está organizada por dominio: `api/` para los servicios HTTP (Axios), `components/` con UI reutilizable, `store/` con estado global en Zustand y `i18n/` con soporte multi-idioma.

**Despliegue:** Vite genera assets con hash en el nombre del archivo. La estrategia de cache en CloudFront diferencia:

- `*.js`, `*.css`, imágenes: cache de 1 año (inmutable por el hash)
- `index.html`: `no-cache` (siempre se descarga la versión actual)

Esto significa que un nuevo deploy invalida solo el `index.html` y los assets referenciados por el nuevo bundle, sin romper usuarios que tienen la versión anterior cargada.

## Terraform: 10 módulos independientes

```
infrastructure/modules/
├── vpc/               # CIDR, subnets públicas/privadas, IGW, NAT conditional
├── security_groups/   # Cadena ALB → ECS → RDS
├── ecr/               # Registro privado de imágenes con lifecycle policies
├── rds/               # PostgreSQL 15 con parámetros por ambiente
├── secrets/           # Secretos de DB, JWT y SMTP en Secrets Manager
├── alb/               # Load balancer HTTP (dev) / HTTPS (prod con ACM)
├── ecs_backend/       # Fargate service, task definition, IAM roles, logs
├── s3_frontend/       # Bucket privado para la SPA
├── s3_documents/      # Bucket para documentos de usuarios
└── cloudfront/        # CDN con OAC, SPA routing y headers de cache
```

El módulo `ecs_backend` inyecta automáticamente los secretos de Secrets Manager en el task definition como variables de entorno. La aplicación Spring Boot las lee en startup sin saber si viene de un `.env` local o de AWS.

**State remoto:** S3 bucket `nexoratech-terraform-state` con DynamoDB para locking, evitando applies simultáneos en el mismo ambiente.

## CI/CD: 3 pipelines con OIDC

### Backend (`backend.yml`)

1. **Test:** `./mvnw test` con `SPRING_PROFILES_ACTIVE=test` y upload del reporte Jacoco
2. **Deploy Dev:** push a `develop` → build JAR → Docker image con SHA de commit → push a ECR → update ECS service
3. **Deploy Prod:** push a `main` → mismo flujo apuntando al ambiente de producción

### Frontend (`frontend.yml`)

1. **Build:** `npm ci && npm run build` con la variable `VITE_API_URL` del ambiente
2. **Deploy:** sync a S3 con cache-control diferenciado + invalidación de CloudFront en todas las rutas

### Infraestructura (`terraform.yml`)

1. `terraform fmt -check` + `terraform validate`
2. `terraform plan` con comentario automático en PR
3. `terraform apply -auto-approve` en merge a `main`

Los tres pipelines usan **OIDC federation**: GitHub Actions asume un rol IAM específico (Terraform role o Deploy role) sin que ningún `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` exista en los secrets del repositorio.

## AI DevOps Agent

El archivo `agent.py` es un agente conversacional que usa la Claude API con tool use para consultar y gestionar la infraestructura AWS en lenguaje natural.

El agente tiene acceso a más de 30 herramientas que cubren:

- **Cómputo:** EC2, ECS, EKS, Lambda, Elastic Beanstalk
- **Base de datos:** RDS, DynamoDB, ElastiCache
- **Red:** VPC, ALB, Route53, CloudFront, API Gateway
- **Seguridad:** IAM, GuardDuty, análisis de Security Groups (detecta puertos abiertos peligrosos)
- **Observabilidad:** CloudWatch alarms, logs y métricas
- **Costos:** Cost Explorer por servicio

Una consulta como *"¿cuánto estamos gastando en RDS este mes y hay alguna alarma activa?"* genera múltiples llamadas paralelas a AWS, consolida los resultados y responde en español en lenguaje natural.

## Seguridad end-to-end

**En red:**
- Producción: ECS en subnets privadas — los tasks no tienen IP pública. El único punto de entrada es el ALB
- Security groups en cadena: el ALB solo acepta tráfico público; ECS solo acepta tráfico del ALB; RDS solo acepta tráfico de ECS
- S3 buckets privados accedidos exclusivamente por CloudFront via OAC

**En datos:**
- RDS con cifrado en reposo (TDE)
- S3 con SSE-S3
- Secrets Manager con KMS

**En CI/CD:**
- Roles IAM separados: uno para Terraform (PowerUserAccess + IAM) y otro para deploy (solo ECR, ECS, S3, CloudFront)
- OIDC scoped al repositorio — ningún otro repo puede asumir estos roles

**En aplicación:**
- BCrypt para passwords
- JWT con expiración configurable
- MFA con bloqueo de cuenta
- Tokens de activación de cuenta con expiración de 24 horas
- Headers de seguridad en Nginx: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`

## Lessons learned

**La diferencia real entre dev y prod no es solo el tamaño de la instancia.** Es la topología de red completa: pasar de subnets públicas a privadas requiere NAT Gateway, cambia los security groups, y obliga a repensar cómo los tasks de ECS acceden a internet para descargar imágenes de ECR. Modelar esto en Terraform con una variable `enable_nat_gateway` que cambia múltiples recursos fue el ejercicio más revelador del proyecto.

**Secrets Manager es más simple de lo que parece.** La mayor complejidad no está en crear los secretos sino en el IAM: el execution role del task necesita `secretsmanager:GetSecretValue` sobre los ARNs específicos. Una vez que ese permiso existe, ECS inyecta los valores automáticamente antes de que el contenedor arranque.

**OIDC elimina una categoría completa de riesgo.** Con credenciales estáticas, un leak en CI expone acceso permanente hasta que alguien rote manualmente. Con OIDC, las credenciales son tokens efímeros válidos por minutos. No hay nada que rotar porque no hay nada persistente que comprometer.
