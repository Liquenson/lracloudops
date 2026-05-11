---
titulo: "Docker en producción: multi-stage builds, usuarios no-root y health checks reales"
descripcion: "Best practices reales de containerización basadas en docker-devops-platform: por qué los multi-stage builds no son solo para reducir tamaño, cómo el usuario no-root cambia el modelo de seguridad, y por qué depends_on no es suficiente."
fecha: 2026-04-28
tags: ["Docker", "Containerización", "FastAPI", "PostgreSQL", "DevOps", "Seguridad", "CI/CD"]
draft: false
---

## El error de confundir "funciona en Docker" con "está bien containerizado"

Ejecutar `docker build` y `docker run` no es containerización — es solo empaquetar código en un contenedor. La diferencia entre una imagen que "funciona" y una imagen production-ready es el conjunto de decisiones de diseño que tomamos antes de escribir la primera línea del Dockerfile.

El proyecto **docker-devops-platform** nació exactamente de esa necesidad: documentar con código real qué significa containerizar correctamente una aplicación Python con base de datos. No como ejercicio académico, sino como referencia concreta de las decisiones que marcamos como estándar en nuestros proyectos.

Este artículo explica cada decisión, por qué la tomamos y qué problema resuelve.

## El Dockerfile completo y por qué está así

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

RUN useradd -m appuser

COPY --from=builder /root/.local /home/appuser/.local
COPY src ./src

ENV PATH=/home/appuser/.local/bin:$PATH

USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Son 19 líneas. Cada una tiene una razón de ser.

## Multi-stage build: el beneficio real no es el tamaño

El beneficio más citado de los multi-stage builds es la reducción del tamaño de imagen. Es real: eliminar pip, setuptools y las herramientas de compilación reduce la imagen final significativamente. Pero no es el beneficio más importante.

**El beneficio principal es de superficie de ataque.**

Una imagen con pip instalado puede instalar paquetes arbitrarios si el contenedor es comprometido. Una imagen sin pip no puede. Una imagen con compiladores instalados puede compilar código nativo. Una imagen sin ellos no puede. La imagen de runtime del multi-stage build es más difícil de usar como plataforma para un atacante.

La mecánica del multi-stage es simple:

```dockerfile
# Stage 1: instalar dependencias (incluye pip, gcc si hay paquetes nativos)
FROM python:3.12-slim AS builder
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: solo runtime
FROM python:3.12-slim
COPY --from=builder /root/.local /home/appuser/.local
```

El `--user` flag en pip instala las dependencias en `~/.local` en lugar de en el sistema. Esto hace más sencilla la copia entre stages: solo necesitamos copiar ese directorio, no toda la instalación de Python del sistema.

## Usuario no-root: por qué importa y cómo se implementa

Los contenedores corren como root por defecto. Esto no es solo un problema teórico — si hay una vulnerabilidad en FastAPI, en uvicorn o en cualquier dependencia, y un atacante logra ejecutar código arbitrario dentro del contenedor, tiene privilegios de root.

Root dentro del contenedor no es lo mismo que root en el host (gracias a los namespaces de Linux), pero sigue siendo problemático: puede leer cualquier archivo del sistema de archivos del contenedor, puede escribir en el filesystem del host si hay un volumen montado sin restricciones, y puede intentar explotar vulnerabilidades del kernel.

La solución:

```dockerfile
RUN useradd -m appuser
# ...
USER appuser
```

Creamos un usuario sin privilegios antes de cambiar al mismo. El flag `-m` crea el directorio home — necesario porque pip instala en `~/.local` y necesitamos que ese directorio exista para el usuario correcto.

Un detalle importante: si el proceso del contenedor necesita escribir en algún directorio, ese directorio debe tener permisos para el usuario `appuser`. Las imágenes que corren como root evitan este problema pero al precio de la seguridad.

## La aplicación FastAPI y los endpoints

La aplicación es un backend FastAPI + Uvicorn con dos endpoints:

```python
@app.get("/")
def root():
    return {"message": "Docker DevOps Platform Running"}

@app.get("/health")
def health():
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}
```

El endpoint `/` es solo información. El endpoint `/health` activamente verifica la conectividad con PostgreSQL. Esta diferencia es fundamental para Kubernetes: los liveness probes y readiness probes deben distinguir entre "el proceso Python está vivo" y "la aplicación puede servir tráfico correctamente".

Un health check que solo verifica que el proceso está vivo da falsos positivos. Un health check que verifica la conectividad con la base de datos detecta el problema real que causaría errores a los usuarios.

## Retry logic: por qué depends_on no es suficiente

El `depends_on` de Docker Compose tiene una limitación fundamental que no está bien documentada: verifica que el **contenedor** esté en estado `running`, no que la **aplicación dentro del contenedor** esté lista para recibir conexiones.

PostgreSQL tarda 2-4 segundos en inicializar su cluster de datos después de que el contenedor arranca. Durante esos segundos, el proceso está vivo pero el puerto 5432 no acepta conexiones. Sin retry logic, la aplicación falla inmediatamente al intentar conectarse y el contenedor se reinicia en loop.

La implementación de retry logic:

```python
def get_db_connection(retries=5, delay=2):
    for _ in range(retries):
        try:
            return psycopg2.connect(
                host=os.getenv("DB_HOST") or "db",
                port=int(os.getenv("DB_PORT") or 5432),
                dbname=os.getenv("DB_NAME") or "app_db",
                user=os.getenv("DB_USER") or "app_user",
                password=os.getenv("DB_PASSWORD") or "secure_password",
            )
        except Exception:
            time.sleep(delay)
    raise Exception("Database connection failed")
```

5 intentos con 2 segundos de espera entre cada uno: hasta 10 segundos de gracia para que la base de datos esté lista. Si después de eso sigue sin conectar, falla con un error claro (no un stack trace de psycopg2).

## Docker Compose: orquestar sin Kubernetes

El Docker Compose de desarrollo declara los dos servicios y sus dependencias:

```yaml
services:
  app:
    build:
      context: ../app
    container_name: docker-devops-app
    ports:
      - "8000:8000"
    environment:
      APP_ENV: development
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: app_db
      DB_USER: app_user
      DB_PASSWORD: secure_password
    depends_on:
      - db
    restart: always

  db:
    image: postgres:15-alpine
    container_name: postgres-db
    environment:
      POSTGRES_DB: app_db
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

volumes:
  postgres_data:
```

El volumen `postgres_data` persiste los datos de PostgreSQL entre reinicios de contenedores. Sin el volumen, cada `docker compose down` borra todos los datos. Para desarrollo está bien — para producción, los datos de la base de datos no deberían estar en un volumen local sino en un servicio gestionado (RDS, Cloud SQL, etc.).

La imagen `postgres:15-alpine` es preferible a `postgres:15`: la variante alpine es más pequeña y tiene menos paquetes instalados, reduciendo también la superficie de ataque del contenedor de base de datos.

## El pipeline CI/CD: integración real, no tests unitarios

El pipeline de GitHub Actions es deliberadamente simple porque su objetivo es específico: verificar que los servicios realmente arrancan y se comunican entre sí, no solo que el código compila.

```yaml
jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t docker-devops-app ./app
        
      - name: Start services
        run: docker compose -f docker/docker-compose.dev.yml up -d
        
      - name: Wait for services
        run: sleep 10
        
      - name: Verify health
        run: |
          curl -f http://localhost:8000/health
          
      - name: Cleanup
        run: docker compose -f docker/docker-compose.dev.yml down
```

Este tipo de test de integración detecta problemas que los tests unitarios no pueden detectar:
- ¿El Dockerfile compila correctamente en un ambiente limpio?
- ¿La aplicación puede conectarse a PostgreSQL con las credenciales configuradas?
- ¿El endpoint `/health` devuelve 200 cuando todo está bien?

Los tests unitarios pueden pasar perfectamente aunque el Dockerfile esté roto o las variables de entorno estén mal configuradas.

## NGINX como reverse proxy (próximo paso)

La plataforma tiene un Dockerfile de NGINX preparado (`nginx/Dockerfile`) para el siguiente paso: poner un reverse proxy delante de uvicorn.

Un reverse proxy resuelve varios problemas que uvicorn no maneja bien por sí solo:

- **Rate limiting:** uvicorn no implementa limitación de requests por IP
- **Headers de seguridad:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- **Terminación SSL:** uvicorn puede hacer SSL pero es más complejo de configurar que NGINX
- **Buffering:** NGINX bufferiza requests lentos y los pasa a uvicorn cuando están completos, protegiendo de ataques slowloris

La arquitectura completa con NGINX:

```
Internet → NGINX (puerto 80/443) → uvicorn (puerto 8000) → PostgreSQL
```

## Variables de entorno: lo que nunca debe estar en la imagen

Las credenciales de base de datos en el Docker Compose de desarrollo están en texto plano. Esto está bien para desarrollo local donde no hay datos sensibles. Para producción, las credenciales deben venir de un sistema de secretos:

- **AWS:** Secrets Manager (que es exactamente lo que usamos en NexoraTech)
- **Kubernetes:** Secrets de Kubernetes (cifrados en etcd)
- **Docker Swarm:** Docker Secrets

La regla es simple: si el valor cambia entre ambientes, va en una variable de entorno. Si el valor es sensible, va en un sistema de secretos. Nunca en el Dockerfile, nunca en el Compose, nunca en Git.

## Lecciones aprendidas

**La primera lección fue sobre el `--user` flag de pip.** Al instalar con `pip install --user` en el builder stage, las dependencias van a `/root/.local`. Pero cuando creamos `appuser` en el runtime stage y cambiamos `USER appuser`, el PATH de las dependencias ya no apunta al directorio correcto. La solución es copiar explícitamente el directorio de dependencias al home del nuevo usuario: `COPY --from=builder /root/.local /home/appuser/.local` y ajustar el PATH.

**La segunda lección fue sobre la diferencia entre `healthcheck` en Compose y retry logic en la aplicación.** Son complementarios, no alternativos. El healthcheck de Compose determina cuándo el contenedor está "healthy" para que `depends_on: condition: service_healthy` funcione. La retry logic en la aplicación es el fallback cuando el healthcheck no es suficientemente granular o cuando la aplicación arranca antes de que la condición de healthcheck esté satisfecha.

**La tercera lección fue sobre los logs de contenedores.** Un contenedor que corre como `appuser` puede tener problemas para escribir en algunos directorios del filesystem. Configurar el logging para que salga por stdout/stderr (no a archivos) resuelve esto y es además la práctica correcta en contenedores: Docker captura stdout/stderr y los hace disponibles via `docker logs`.

Si estás containerizando aplicaciones Python para producción y quieres una segunda opinión sobre tu Dockerfile o tu estrategia de imágenes, [escríbenos](/contacto).
