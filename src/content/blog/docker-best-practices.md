---
titulo: "Production Container Design: Multi-Stage Builds, Non-Root Users and Health Checks"
descripcion: "The design decisions that separate a container image that runs from one that is production-ready. Multi-stage builds, non-root execution, database connection retry logic and meaningful health check endpoints."
fecha: 2026-04-28
tags: ["Docker", "Containerización", "FastAPI", "PostgreSQL", "DevOps", "Seguridad", "CI/CD"]
draft: false
---

## Problem

Running `docker build` and `docker run` is not containerization — it is packaging code into a container. The difference between an image that works and an image that is production-ready is a set of design decisions made before writing the first line of the Dockerfile.

The decisions are not about which base image to choose. They are about attack surface, process isolation, startup behavior and the operational signals the container emits when something is wrong.

## Context

The `docker-devops-platform` project implements a FastAPI backend with a PostgreSQL dependency as a reference for production containerization decisions. Every line of the Dockerfile has a documented reason. This article explains those decisions and the problems each one prevents.

## Architecture

The target architecture: FastAPI running under Uvicorn, PostgreSQL in a companion container, Docker Compose for local orchestration, GitHub Actions for integration testing in CI.

```
Internet → NGINX (port 80/443) → Uvicorn (port 8000) → PostgreSQL
```

The container design decisions operate at the Uvicorn layer and below.

## Implementation

### The Dockerfile

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

19 lines. Each one deliberate.

### Multi-stage builds: the real benefit is attack surface, not image size

The most commonly cited benefit of multi-stage builds is image size reduction. Removing pip, setuptools and compilation tools from the runtime image shrinks the layer count. That is real but secondary.

The primary benefit is reduced attack surface. An image with pip installed can install arbitrary packages if the container is compromised. An image without pip cannot. An image with gcc installed can compile native code. An image without it cannot. The runtime stage of a multi-stage build is harder to use as an attack platform.

The `--user` flag on pip installs dependencies into `~/.local` rather than the system Python directory. This makes the cross-stage copy explicit:

```dockerfile
# Stage 1: install with --user
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: copy exactly that directory
COPY --from=builder /root/.local /home/appuser/.local
```

Only the application dependencies are copied. No build tooling, no cache, no intermediate files.

### Non-root execution

Containers run as root by default. This is not an abstract risk: if there is a vulnerability in FastAPI, Uvicorn or any dependency and an attacker achieves arbitrary code execution inside the container, they have root privileges.

Root inside a container is not the same as root on the host — Linux namespaces provide isolation — but it remains problematic. A root process can read any file in the container filesystem, can write to host volumes mounted without explicit restrictions and can attempt kernel exploit paths.

```dockerfile
RUN useradd -m appuser
# ...
USER appuser
```

The `-m` flag creates the home directory. This is required because pip installs into `~/.local`, and that directory must exist for the correct user before the process runs.

A non-root container requires that any directory the process writes to has permissions for `appuser`. This is a design constraint that surfaces file permission issues early — in development, not in production.

### Health check endpoints

The application exposes two endpoints with distinct semantics:

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

The `/` endpoint confirms the process is alive. The `/health` endpoint confirms the application can serve traffic — which requires a functioning database connection.

For Kubernetes liveness and readiness probes, this distinction is critical. A liveness probe that only verifies the process is running will pass even when the database connection pool is exhausted. A readiness probe that checks `/health` will remove the pod from load balancer rotation when the database is unreachable, preventing requests from being routed to a pod that cannot serve them.

### Connection retry logic

Docker Compose `depends_on` has a documented limitation: it verifies that the container is in `running` state, not that the application inside the container is ready to accept connections.

PostgreSQL takes 2-4 seconds after container startup to initialize its data cluster. During that window, the port is not accepting connections. Without retry logic, the application fails immediately on startup and enters a crash loop.

```python
def get_db_connection(retries=5, delay=2):
    for _ in range(retries):
        try:
            return psycopg2.connect(
                host=os.getenv("DB_HOST", "db"),
                port=int(os.getenv("DB_PORT", 5432)),
                dbname=os.getenv("DB_NAME", "app_db"),
                user=os.getenv("DB_USER", "app_user"),
                password=os.getenv("DB_PASSWORD"),
            )
        except Exception:
            time.sleep(delay)
    raise Exception("Database connection failed after retries")
```

5 attempts with 2-second intervals: up to 10 seconds of grace before failing with a clear error message rather than a psycopg2 stack trace. The error message matters during incidents — a clear failure reason reduces time to diagnosis.

### CMD array syntax

```dockerfile
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

The JSON array form of CMD runs the executable directly as PID 1. The shell form — `CMD uvicorn ...` — runs the command under `/bin/sh -c`, making the shell PID 1 and Uvicorn a child process. Signals sent by Docker (SIGTERM on `docker stop`) are received by the shell, which may or may not propagate them to the child. The array form ensures signals reach the application process directly.

## Operational Considerations

**Docker Compose for local development**

```yaml
services:
  app:
    build:
      context: ../app
    ports:
      - "8000:8000"
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: app_db
      DB_USER: app_user
      DB_PASSWORD: ${DB_PASSWORD}
    depends_on:
      - db
    restart: always

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: app_db
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

The `postgres_data` named volume persists database state across container restarts. Without it, every `docker compose down` destroys the database. In production, the database should be a managed service (RDS, Cloud SQL) — not a container volume.

The `postgres:15-alpine` variant is smaller and has fewer installed packages than `postgres:15`, reducing attack surface in the database container as well.

**Credentials in development vs production** — the Docker Compose file uses environment variables for credentials. In development these come from a `.env` file. In production, credentials must come from a secrets management system: AWS Secrets Manager, Kubernetes Secrets or equivalent. The rule: if the value changes between environments, it is a variable. If the value is sensitive, it never appears in a Dockerfile, Compose file or source control.

**CI integration testing** — the GitHub Actions pipeline verifies not just that the image builds, but that the full stack starts and the health endpoint responds:

```yaml
- name: Start services
  run: docker compose -f docker/docker-compose.dev.yml up -d
- name: Wait for startup
  run: sleep 10
- name: Verify health
  run: curl -f http://localhost:8000/health
- name: Cleanup
  run: docker compose -f docker/docker-compose.dev.yml down
```

This integration test catches problems that unit tests cannot: a Dockerfile that builds but fails at runtime, missing environment variables, a database connection that fails under real network conditions.

## Outcome

The design decisions documented here address specific failure modes. Multi-stage builds reduce the tools available to an attacker inside a compromised container. Non-root execution limits the blast radius of a container escape. Connection retry logic eliminates the startup ordering problem that causes crash loops in orchestrated environments. The JSON CMD form ensures signals propagate correctly during graceful shutdown.

A container built with these properties starts reliably, fails clearly when dependencies are unavailable, handles shutdown gracefully and presents minimal attack surface. These are not optimizations for high-traffic workloads — they are baseline requirements for any container running in a production environment.
