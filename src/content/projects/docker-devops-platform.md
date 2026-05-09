---
titulo: "Docker DevOps Platform"
descripcion: "Plataforma backend containerizada con FastAPI y PostgreSQL 15. Implementa best practices de containerización: multi-stage builds, usuario no-root, health checks y retry logic para conexión a base de datos."
fecha: 2026-02-01
categoria: "Containerización"
madurez: "En Desarrollo"
stack: ["Python 3.12", "FastAPI 0.115", "Uvicorn", "PostgreSQL 15", "Docker", "Docker Compose", "GitHub Actions"]
cicd: true
github: "https://github.com/Liquenson/docker-devops-platform"
featured: false
iconPath: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
draft: false
metricas:
  - { label: "Servicios Docker", value: "2" }
  - { label: "Endpoints API", value: "2" }
  - { label: "Build stages", value: "Multi-stage" }
  - { label: "Usuario container", value: "Non-root" }
highlights:
  - "Multi-stage Docker build: imagen final mínima sin herramientas de compilación ni pip"
  - "Usuario no-root (appuser) en contenedor: seguridad desde el diseño inicial"
  - "Retry logic para conexión a PostgreSQL: el servicio espera a que la DB esté lista"
  - "Health checks declarados en Docker Compose con dependencias entre servicios"
  - "FastAPI + Uvicorn ASGI: alta performance y documentación automática en /docs"
  - "CI verifica build + arranque + health endpoint en cada push antes de mergear"
arquitectura:
  - { nombre: "FastAPI + Uvicorn", descripcion: "API ASGI de alta performance con documentación OpenAPI automática en /docs" }
  - { nombre: "PostgreSQL 15", descripcion: "Base de datos relacional en contenedor Docker con volumen persistente nombrado" }
  - { nombre: "Docker Compose", descripcion: "Orquestación multi-servicio con healthchecks declarados y dependencias entre containers" }
  - { nombre: "Multi-stage Build", descripcion: "Dependencias instaladas en builder stage; imagen final solo con runtime" }
  - { nombre: "GitHub Actions CI", descripcion: "Pipeline que construye, arranca y verifica el endpoint /health en cada commit" }
---

## Descripción del proyecto

Docker DevOps Platform es una plataforma backend que sirve como referencia de best practices de containerización con Python y PostgreSQL. El objetivo es demostrar que containerizar correctamente una aplicación va más allá de ejecutar `docker build` — hay decisiones de diseño que afectan la seguridad, el rendimiento y la mantenibilidad a largo plazo.

## Best practices implementadas

### Multi-stage build

El Dockerfile usa dos stages: el primero instala dependencias (incluyendo herramientas de compilación), el segundo copia solo lo necesario para ejecutar la aplicación en runtime. La imagen final no contiene pip, setuptools ni ninguna herramienta de desarrollo.

```dockerfile
FROM python:3.12-slim AS builder
RUN pip install --user -r requirements.txt

FROM python:3.12-slim
COPY --from=builder /root/.local /root/.local
COPY app/ app/
```

### Usuario no-root

Los contenedores que corren como root son un riesgo de seguridad. Si hay una vulnerabilidad en la aplicación y el atacante obtiene ejecución de código, tiene privilegios de root en el contenedor. La plataforma define un usuario `appuser` dedicado sin privilegios elevados.

### Retry logic para base de datos

Los contenedores no arrancan en orden exacto aunque Docker Compose declare dependencias con `depends_on`. PostgreSQL puede tardar 2-3 segundos extra en inicializar después de que el contenedor está "running". La aplicación implementa retry logic: si la conexión falla, espera y reintenta hasta N veces antes de fallar con un error claro.

## Pipeline de CI

El workflow de GitHub Actions replica exactamente lo que un desarrollador haría manualmente para verificar que el servicio funciona:

1. `docker build` — verifica que la imagen compila sin errores
2. `docker compose up -d` — arranca todos los servicios en background
3. `curl http://localhost:8000/health` — verifica que la aplicación responde y se conecta a la DB
4. `docker compose down` — limpia el entorno

Este enfoque detecta problemas de integración que los tests unitarios no pueden detectar: que los servicios realmente arrancan juntos, que la conexión a la base de datos funciona en el entorno real.

## API actual

```
GET /       → {"message": "Docker DevOps Platform", "status": "running"}
GET /health → {"status": "healthy", "database": "connected"}
```

El endpoint `/health` verifica activamente la conectividad con PostgreSQL, no solo que el proceso Python esté vivo.

## Roadmap

El proyecto está activamente en desarrollo con estas capacidades planificadas:
- NGINX como reverse proxy con headers de seguridad y rate limiting
- Push automático de imagen a Docker Hub o GHCR en CI/CD
- Manifests de Kubernetes para despliegue en cluster
- Prometheus metrics endpoint para observabilidad

## Lessons learned

La lección más importante fue sobre el orden de arranque en Docker Compose. El parámetro `depends_on` verifica que el contenedor esté corriendo, no que la aplicación dentro esté lista. PostgreSQL tarda unos segundos en inicializar el cluster de datos después de que el contenedor arranca. La solución correcta es retry logic en la aplicación — no confiar en el healthcheck de Docker Compose como única garantía.

La segunda lección: los multi-stage builds reducen el tamaño de imagen significativamente, pero el principal beneficio es de seguridad: una imagen sin compilador ni pip tiene una superficie de ataque mucho menor si el contenedor es comprometido.
