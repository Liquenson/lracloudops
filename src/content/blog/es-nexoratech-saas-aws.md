---
titulo: "Despliegue de una Plataforma SaaS en AWS ECS Fargate: Arquitectura y Decisiones Operacionales"
descripcion: "Decisiones arquitectónicas detrás de NexoraTech: flujo de tráfico, límites de módulos Terraform, diferencias de topología dev/prod, CI/CD OIDC sin credenciales estáticas, estrategia de caché CloudFront y tests de integración con Testcontainers."
fecha: 2026-05-08
tags: ["AWS", "ECS Fargate", "Terraform", "Spring Boot", "React", "CloudFront", "DevOps", "SaaS", "OIDC"]
draft: false
---

## Problema

Desplegar una plataforma SaaS en AWS no es principalmente un problema de código. Es una serie de decisiones de infraestructura que determinan el coste operacional, la postura de seguridad, el comportamiento en recuperación y la capacidad del equipo para cambiar cosas de forma segura a lo largo del tiempo.

La mayoría de guías de arquitectura se centran en qué construir. Este artículo se centra en las decisiones tomadas al construir NexoraTech — una plataforma Spring Boot 4 y React 18 en AWS ECS Fargate — específicamente las decisiones en las que la elección obvia era incorrecta, y por qué.

## Contexto

NexoraTech es una plataforma de agencia completa: backend Spring Boot 4.0.3 con Java 17, frontend React 18 con Vite 5, PostgreSQL 17 en la base de datos. El despliegue en AWS usa ECS Fargate para la ejecución de contenedores, CloudFront para distribución, ALB para balanceo de carga, RDS para la base de datos y Secrets Manager para credenciales en tiempo de ejecución.

## Flujo de tráfico

```
Usuario
  ↓
CloudFront (CDN + caché + WAF)
  ↓ (requests de API)
ALB (Application Load Balancer)
  ↓
ECS Fargate (Spring Boot, puerto 8080)
  ↓
RDS PostgreSQL 17
  ↓ (documentos)
S3 Documents Bucket
```

El frontend React se sirve desde S3 a través de CloudFront OAC (Origin Access Control). El bucket S3 no tiene acceso público — solo CloudFront puede leer de él. El backend de ECS Fargate nunca es accesible directamente desde internet; toda la comunicación pasa por el ALB.

## Módulos Terraform: 11 con propósito único

```
modules/
  vpc/              # Red, subnets, routing
  security_group/   # Reglas de ingreso/egreso
  ecr/              # Registro de contenedores
  rds/              # PostgreSQL gestionado
  ecs_backend/      # Servicio Fargate, definición de tarea
  secrets_manager/  # Secretos en tiempo de ejecución
  s3_frontend/      # Bucket estático React
  s3_documents/     # Almacenamiento de documentos
  cloudfront/       # Distribución CDN con OAC
  alb/              # Balanceador de carga
  nat/              # NAT Gateway (solo producción)
```

Once módulos en lugar de uno grande. Cada módulo tiene un único propósito y una interfaz de outputs explícita. La composición ocurre en `environments/dev/` y `environments/prod/` — los módulos no se conocen entre sí.

**La decisión que importó:** el módulo `nat` solo se instancia en producción. Dev usa subnets públicas y no tiene NAT Gateway. Esto ahorra aproximadamente $32/mes en costes de NAT en dev, que se acumula. La penalización es que dev y prod tienen topologías de red distintas — una diferencia documentada y gestionada conscientemente.

## OIDC: sin credenciales estáticas

Los tres pipelines de CI/CD (backend, frontend, terraform) usan roles IAM asumidos via OIDC desde GitHub Actions:

```yaml
permissions:
  id-token: write
  contents: read

- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
    aws-region: us-east-1
```

No hay `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` en los secretos del repositorio. Las credenciales de larga duración no existen para los pipelines. El rol IAM que GitHub asume tiene el mínimo de permisos necesarios — diferente para cada pipeline, con políticas separadas para backend, frontend y terraform.

**Por qué importa:** las credenciales estáticas expiran, se filtran accidentalmente en logs, y requieren rotación manual. Los roles OIDC expiran con la sesión del job de CI. El único valor persistente es el ARN del rol, que no es un secreto.

## Caché de CloudFront: dos comportamientos distintos

```hcl
# Frontend estático — caché agresivo
cache_policy = aws_cloudfront_cache_policy.static_assets.id
  default_ttl = 86400  # 1 día
  max_ttl     = 31536000  # 1 año

# API — sin caché
cache_policy = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # Managed-CachingDisabled
```

Los assets estáticos de React (JS, CSS con hashes de contenido en los nombres de archivo) se cachean agresivamente. Cuando Vite construye una nueva versión, los hashes cambian — la URL es diferente, no hay problema de caché. El HTML index no tiene hash, por lo que tiene TTL corto.

Las rutas de API tienen caché deshabilitada. Una petición a `/api/clients` que devuelve datos en caché durante un día no es un ahorro de coste — es un bug.

## Testcontainers: tests contra una base de datos real

```java
@SpringBootTest
@Testcontainers
class ClientServiceIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Test
    void createClient_persistsToDatabase() {
        // test contra PostgreSQL 17 real, no un mock
    }
}
```

Los tests de integración usan Testcontainers para arrancar un PostgreSQL real en Docker durante la ejecución de tests. Esto verifica que las migraciones Flyway son válidas, que las consultas JPA son correctas contra el dialecto PostgreSQL real y que las restricciones de la base de datos se cumplen.

**La alternativa (H2 en memoria) falló:** H2 acepta algunas sintaxis SQL específicas de PostgreSQL pero no todas. Los tests pasaban en CI contra H2 y fallaban en producción contra PostgreSQL real. Testcontainers elimina esa divergencia.

## Secrets Manager: nada en variables de entorno

```java
// Bootstrap de secretos en startup
@Configuration
public class SecretsConfig {
    
    @Bean
    public DataSource dataSource(AWSSecretsManager secretsManager) {
        GetSecretValueResult secret = secretsManager
            .getSecretValue(new GetSecretValueRequest()
                .withSecretId("nexoratech/prod/db"));
        
        JsonObject secretJson = JsonParser.parseString(secret.getSecretString()).getAsJsonObject();
        // construir DataSource con credenciales del secreto
    }
}
```

Las credenciales de base de datos, el secreto JWT y las credenciales SMTP se almacenan en Secrets Manager. La aplicación los obtiene en el arranque via SDK de AWS. No están en variables de entorno de la tarea ECS, no están en archivos `.env`, no están en el repositorio.

La tarea ECS tiene un rol IAM con permiso específico solo para leer los secretos que necesita — no para leer todos los secretos de la cuenta.
