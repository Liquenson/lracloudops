---
titulo: "Diseño de Contenedores en Producción: Builds Multi-Stage, Usuarios No-Root y Health Checks"
descripcion: "Las decisiones de diseño que separan una imagen de contenedor que funciona de una que está lista para producción. Builds multi-stage, ejecución sin root, lógica de reintento de conexión a BD y endpoints de health check con significado real."
fecha: 2026-04-28
tags: ["Docker", "Containerización", "FastAPI", "PostgreSQL", "DevOps", "Seguridad", "CI/CD"]
draft: false
---

## Problema

Ejecutar `docker build` y `docker run` no es containerización — es empaquetar código en un contenedor. La diferencia entre una imagen que funciona y una que está lista para producción es un conjunto de decisiones de diseño tomadas antes de escribir la primera línea del Dockerfile.

Las decisiones no son sobre qué imagen base elegir. Son sobre superficie de ataque, aislamiento de procesos, comportamiento en el arranque y las señales operacionales que el contenedor emite cuando algo falla.

## Contexto

La plataforma: FastAPI 0.115.0 sobre Python 3.12, conectando a PostgreSQL 15, ejecutándose como servicio de contenedor bajo orquestación Docker Compose. Los requisitos no funcionales que guían el diseño: imagen mínima, proceso sin root, health checks accionables, lógica de reintento resiliente.

## Build multi-stage

```dockerfile
# Etapa de build
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Etapa de producción
FROM python:3.12-slim
WORKDIR /app
RUN groupadd -r appuser && useradd -r -g appuser appuser
COPY --from=builder /root/.local /home/appuser/.local
COPY app/ .
USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

La etapa de build instala dependencias con sus herramientas de compilación. La etapa de producción copia solo los paquetes instalados, sin el compilador, sin los archivos de build, sin el caché pip. El resultado: imagen final sin las herramientas que un atacante usaría para escalar privilegios o instalar herramientas adicionales.

El tamaño importa por una razón práctica: las imágenes más pequeñas se descargan más rápido durante el escalado. Menos herramientas instaladas significa menos superficie que parchear en actualizaciones.

## Ejecución sin root

Los contenedores se ejecutan como root por defecto. Un proceso root dentro de un contenedor tiene UID 0, que corresponde a root en el host si el aislamiento de namespaces falla. "Falla" incluye: exploits del kernel, vulnerabilidades en el runtime de contenedores, o configuraciones incorrectas de seccomp.

La mitigación es ejecutar como un usuario sin privilegios creado específicamente para la aplicación:

```dockerfile
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser
```

`-r` crea un usuario del sistema sin directorio home y sin shell de login. El usuario existe solo para ser propietario del proceso — no puede escalar a root sin una escalada de privilegios explícita.

## Lógica de reintento de conexión a base de datos

Los contenedores de aplicación se inician en paralelo con los contenedores de base de datos. La base de datos tarda segundos en estar lista para aceptar conexiones. Un contenedor de aplicación que no reintenta falla inmediatamente con "connection refused" y el orquestador lo reinicia.

```python
import asyncpg
import asyncio

async def get_db_pool(retries: int = 5, delay: float = 2.0):
    for attempt in range(retries):
        try:
            pool = await asyncpg.create_pool(dsn=settings.database_url)
            return pool
        except (OSError, asyncpg.PostgresConnectionError) as e:
            if attempt == retries - 1:
                raise
            await asyncio.sleep(delay * (attempt + 1))
```

El backoff progresivo (`delay * (attempt + 1)`) evita que múltiples réplicas reiniciándose simultáneamente saturen la base de datos con intentos de conexión. El contador de intentos tiene un límite — si la base de datos no está disponible después de `retries` intentos, el contenedor falla con un error limpio en lugar de reintentar indefinidamente.

## Health checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

El endpoint `/health` no hace ping al servidor — verifica conectividad real con dependencias:

```python
@app.get("/health")
async def health_check():
    try:
        async with app.state.db_pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "error", "database": str(e)})
```

Un health check que solo devuelve `{"status": "ok"}` sin verificar dependencias no es un health check — es un latido. El orquestador no puede distinguir entre un servicio que responde correctamente y uno que responde correctamente pero no puede escribir en la base de datos.

`--start-period=5s` da tiempo al contenedor para inicializarse antes de que los fallos del health check cuenten hacia el umbral de reinicio. Sin este parámetro, un contenedor que tarda 3 segundos en conectarse a la base de datos puede ser reiniciado antes de que esté listo.

## .dockerignore

```
.git
.env
*.pyc
__pycache__/
.pytest_cache/
tests/
docs/
*.md
```

El `.dockerignore` determina qué entra en el contexto de build. Sin él, `COPY . .` incluye credenciales locales de `.env`, artefactos de test, documentación y el directorio `.git`. El directorio `.git` por sí solo puede tener cientos de MB en proyectos maduros.

## Variables de entorno vs secrets

Las variables de entorno son visibles en `docker inspect`, en los logs del proceso init del contenedor y en cualquier herramienta que pueda leer el entorno del proceso. Son aceptables para configuración no sensible. Para credenciales de base de datos, claves de API y tokens:

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - db_password
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

Los Docker secrets se montan en `/run/secrets/` como archivos con permisos de solo lectura para el usuario del proceso. No aparecen en el entorno del proceso. No son visibles en `docker inspect`.

## Conclusión

Un contenedor listo para producción no es significativamente más difícil de construir que uno que simplemente funciona. Las decisiones — multi-stage, usuario sin root, health checks reales, lógica de reintento, .dockerignore explícito — son aplicables a cualquier stack y añaden una sesión de trabajo al proceso de containerización inicial. El coste operacional de no haberlas tomado se paga durante el primer incidente de producción.
