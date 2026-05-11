---
titulo: "Cómo desplegamos una plataforma SaaS enterprise en AWS ECS Fargate con Terraform"
descripcion: "Arquitectura completa de NexoraTech: Spring Boot 4 + React 18 + ECS Fargate + CloudFront + RDS PostgreSQL 15 + Secrets Manager. 10 módulos Terraform, 3 pipelines CI/CD sin credenciales via OIDC, JWT + MFA TOTP. Decisiones técnicas reales."
fecha: 2026-05-08
tags: ["AWS", "ECS Fargate", "Terraform", "Spring Boot", "React", "CloudFront", "DevOps", "SaaS", "OIDC"]
draft: false
---

## De la idea a producción: lo que nadie te cuenta

Construir una plataforma SaaS real no es solo escribir código de aplicación. Es la suma de cientos de decisiones de arquitectura que determinan el costo mensual, la postura de seguridad, la capacidad de escalar y la vida del equipo de operaciones a largo plazo.

**NexoraTech** es nuestra plataforma de referencia SaaS cloud-native enterprise sobre AWS. No es un tutorial — es el resultado de aplicar en un proyecto real lo que hemos aprendido en múltiples proyectos de producción: qué funciona, qué parece buena idea hasta que no lo es, y qué debería ser el estándar desde el día uno.

Este artículo descompone las decisiones técnicas clave de la arquitectura.

## El flujo de tráfico completo

```
Usuarios ──► CloudFront ──► S3 (React SPA — activos estáticos)
                │
                └──► ALB ──► ECS Fargate (Spring Boot :8080)
                                   └──► RDS PostgreSQL 15
                                   └──► Secrets Manager
                                   └──► S3 Documents
```

El tráfico del frontend nunca toca el backend — CloudFront sirve la SPA desde S3. El backend recibe solo requests de API, que vienen del frontend mediante fetch/Axios a través del ALB. Este diseño desacopla el escalado: CloudFront escala automáticamente para cualquier volumen de tráfico estático; el backend escala por número de tasks de ECS según la carga de API.

## 10 módulos Terraform: la lógica de la separación

```
infra/modules/
├── vpc/               # Red base: CIDRs, subnets, IGW, NAT conditional
├── security_groups/   # Reglas de firewall por capa
├── ecr/               # Registro de imágenes Docker
├── rds/               # PostgreSQL 15 con parámetros por ambiente
├── secrets/           # DB, JWT y SMTP en AWS Secrets Manager
├── alb/               # Load balancer HTTP/HTTPS
├── ecs_backend/       # Fargate service, task definition, IAM, logs
├── s3_frontend/       # Bucket privado para la SPA
├── s3_documents/      # Bucket para documentos de usuarios
└── cloudfront/        # CDN con OAC, routing SPA, headers de cache
```

La decisión de separar `secrets` en su propio módulo no fue evidente al principio. Los secretos (DB password, JWT secret, SMTP credentials) son referenciados tanto por el módulo RDS (que los crea) como por el módulo ECS (que los inyecta en los tasks). Tener un módulo dedicado rompe esa dependencia circular y deja claro quién es responsable de la gestión del ciclo de vida de los secretos.

## Dev vs Prod: más que cambiar el tamaño de la instancia

La diferencia más importante entre los ambientes no es el tamaño de los recursos — es la topología de red:

```hcl
# environments/dev/terraform.tfvars
enable_nat_gateway    = false
ecs_subnet_type       = "public"     # Tasks en subnets públicas
rds_multi_az          = false
rds_instance_class    = "db.t3.micro"
rds_backup_retention  = 1

# environments/prod/terraform.tfvars
enable_nat_gateway    = true
ecs_subnet_type       = "private"    # Tasks en subnets privadas
rds_multi_az          = true
rds_instance_class    = "db.t3.small"
rds_backup_retention  = 7
rds_deletion_protection = true
```

En desarrollo, los tasks de ECS corren en subnets públicas — esto significa que pueden alcanzar internet directamente para descargar imágenes de ECR sin NAT Gateway. El ahorro en costo es significativo: un NAT Gateway cuesta ~$32/mes fijos más transferencia de datos.

En producción, los tasks están en subnets privadas. Para que ECS pueda descargar imágenes de ECR, el tráfico sale a internet via NAT Gateway. Los tasks nunca tienen IP pública. El único punto de entrada es el ALB, que vive en subnets públicas y reenvía el tráfico al ECS security group.

Este diseño implica que cambiar de dev a prod no es solo cambiar variables — es un cambio de topología de red completo que el módulo `vpc` gestiona internamente según `enable_nat_gateway`.

## Secrets Manager: la alternativa correcta a los .env files

El problema con los `.env` files en producción es el ciclo de vida: ¿quién tiene acceso al .env? ¿Cómo se rota una credencial? ¿Qué pasa si el .env se filtra en un log?

Nuestro módulo `secrets` crea los secretos en AWS Secrets Manager:

```hcl
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.environment}/nexoratech/db"
  
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    endpoint = module.rds.endpoint
    dbname   = var.db_name
  })
}
```

El módulo `ecs_backend` inyecta los secretos en el task definition de ECS:

```hcl
secrets = [
  {
    name      = "DB_PASSWORD"
    valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:password::"
  },
  {
    name      = "JWT_SECRET"
    valueFrom = "${aws_secretsmanager_secret.jwt.arn}:secret::"
  }
]
```

ECS recupera los valores de Secrets Manager antes de arrancar el contenedor y los inyecta como variables de entorno. Spring Boot las lee en startup como si vinieran de un `.env` local — sin saber de dónde provienen realmente.

El execution role del task tiene `secretsmanager:GetSecretValue` solo sobre los ARNs específicos de los secretos del ambiente. No tiene acceso a secretos de otros ambientes ni a otros servicios de AWS.

## Spring Boot 4 + JWT + MFA TOTP

El backend es una API REST stateless. No hay sesiones en servidor — cada request lleva el token JWT en el header `Authorization: Bearer <token>`.

La implementación de seguridad está en el paquete `infrastructure/security/`:

```
infrastructure/security/
├── JwtService.java         # Generación y validación de tokens
├── JwtFilter.java          # Interceptor que valida el token en cada request
└── SecurityConfig.java     # Configuración de Spring Security
```

El módulo de **MFA TOTP** añade una segunda capa al proceso de login:

1. Usuario registra su app autenticadora escaneando un QR code (generado con el secret TOTP)
2. En cada login: validar password → validar código TOTP de 6 dígitos
3. Si el código falla N veces consecutivas, la cuenta se bloquea hasta una fecha calculada

El frontend React muestra el componente `OtpInput` para el código TOTP — una experiencia idéntica a cualquier app bancaria o de correo con 2FA.

**Flyway** gestiona las migraciones de base de datos automáticamente en startup. Cada versión de schema es un archivo SQL versionado en `src/main/resources/db/migration/`:

```
V1__create_users.sql
V2__add_mfa_fields.sql
V3__create_documents.sql
```

Flyway verifica qué migraciones se han ejecutado y aplica solo las nuevas. No hay migraciones manuales ni scripts SQL que "alguien tiene que ejecutar antes del deploy".

## Frontend React: cache strategy con CloudFront

El frontend usa Vite, que genera assets con hash en el nombre del archivo:

```
dist/
├── index.html                         # Sin cache
├── assets/main.a3f8c912.js            # Cache 1 año
├── assets/vendor.b2d1e445.js          # Cache 1 año
└── assets/style.4f7a8901.css          # Cache 1 año
```

La estrategia de cache en CloudFront diferencia por path:

- `/index.html` → `no-cache, no-store` (siempre descarga la versión actual)
- `/assets/*` → `max-age=31536000, immutable` (cache de 1 año, el hash garantiza que el nombre cambia con el contenido)

Esta estrategia elimina el problema clásico del "necesito borrar caché para ver los cambios". El `index.html` siempre es fresco; los assets son inmutables porque su nombre contiene un hash del contenido.

El pipeline de frontend en GitHub Actions realiza la invalidación de CloudFront automáticamente después de subir a S3:

```yaml
- name: Invalidate CloudFront
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
      --paths "/*"
```

## 3 pipelines CI/CD via OIDC

La decisión más importante de CI/CD fue eliminar completamente las credenciales estáticas de AWS de los secrets de GitHub:

```yaml
# backend.yml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    aws-region: eu-west-1
```

GitHub Actions asume un rol IAM via OIDC federation. El rol tiene un trust policy que especifica exactamente qué repositorio y qué rama puede asumirlo:

```json
{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": 
        "repo:Liquenson/nexoratech:ref:refs/heads/main"
    }
  }
}
```

Ningún `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` existe en los secrets del repositorio. Las credenciales que GitHub Actions usa son tokens efímeros válidos por minutos, no keys de larga duración que exigen rotación manual.

**Pipeline backend (`backend.yml`):**
1. `./mvnw test` con `SPRING_PROFILES_ACTIVE=test`
2. Upload del reporte Jacoco a GitHub
3. `docker build` con tag SHA del commit
4. `docker push` a ECR
5. `aws ecs update-service` para forzar redeployment

**Pipeline frontend (`frontend.yml`):**
1. `npm ci && npm run build` con `VITE_API_URL` del ambiente
2. `aws s3 sync dist/ s3://${{ secrets.FRONTEND_BUCKET }}` con cache-control diferenciado
3. Invalidación de CloudFront

**Pipeline infraestructura (`terraform.yml`):**
1. `terraform fmt -check` + `terraform validate`
2. `terraform plan` con comentario automático en la PR
3. `terraform apply -auto-approve` en merge a `main`

Los tres roles IAM tienen permisos mínimos: el rol de Terraform necesita `PowerUserAccess` + permisos IAM; el rol de deploy solo necesita acceso a ECR, ECS, S3 y CloudFront. Roles separados, blast radius mínimo.

## Testcontainers: tests de integración contra PostgreSQL real

Los tests de integración del backend no usan mocks de base de datos — usan Testcontainers para arrancar una instancia PostgreSQL real en el entorno de test:

```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = 
        new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("test_db")
            .withUsername("test")
            .withPassword("test");
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
    }
    
    @Test
    void shouldPersistUser() {
        // test contra PostgreSQL real, no H2 ni mocks
    }
}
```

Esta decisión tiene un costo: los tests tardan más porque Docker arranca el contenedor de PostgreSQL. El beneficio es que los tests verifican el comportamiento real con el motor de base de datos de producción, no con H2 in-memory que tiene semánticas SQL diferentes.

## Lecciones aprendidas

**La diferencia entre dev y prod no es solo de configuración — es de topología.** Mover ECS de subnets públicas a privadas en producción cambió múltiples security groups, requirió NAT Gateway y cambió cómo los tasks alcanzan ECR para descargar imágenes. Modelar esto con `enable_nat_gateway = false/true` en los módulos Terraform fue el ejercicio de diseño más valioso del proyecto.

**OIDC no es complicado — el IAM sí lo es.** Configurar OIDC en sí mismo es directo: crear el Identity Provider en IAM, crear el rol con el trust policy correcto. La complejidad está en los permisos del rol: demasiado permisivos y es un riesgo de seguridad; demasiado restrictivos y el pipeline falla con errores crípticos de AccessDenied en pasos inesperados. La solución fue usar CloudTrail para ver exactamente qué acciones ejecuta el pipeline y ajustar los permisos con precisión.

**Secrets Manager es más simple de implementar que mantener.** Crear y referencias secretos es directo. Lo complejo es la rotación: cuando la contraseña de la base de datos cambia, hay que actualizar el secreto en Secrets Manager, actualizar RDS, y forzar un redeployment de los tasks de ECS para que recojan el nuevo valor. Este flujo tiene que estar documentado y automatizado — no puede depender de que alguien recuerde los pasos.

**CloudFront OAC vs OAI.** Empezamos con Origin Access Identity (OAI), el mecanismo antiguo de CloudFront para acceso privado a S3. En el proceso vimos que AWS recomienda Origin Access Control (OAC) para todos los nuevos deployments. La migración requirió actualizar tanto la distribución de CloudFront como la bucket policy de S3. La diferencia principal es que OAC soporta firma AWS SigV4 y es más seguro.

Si estás diseñando una plataforma SaaS sobre AWS y tienes dudas sobre la arquitectura de seguridad, la estrategia de secretos o cómo estructurar los módulos Terraform, [contáctanos](/contacto). Este es el tipo de trabajo que hacemos.

Puedes explorar la arquitectura completa en la [página del proyecto NexoraTech](/projects/nexoratech).
