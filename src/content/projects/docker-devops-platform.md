---
titulo: "Docker DevOps Platform"
descripcion: "Containerized backend platform with FastAPI and PostgreSQL 15. Multi-stage builds with non-root execution, exponential backoff connection retry and integration CI that verifies the full stack starts and the health endpoint responds."
fecha: 2026-05-01
categoria: "Containerization"
madurez: "In Development"
stack: ["Python 3.12", "FastAPI 0.115.0", "Uvicorn 0.30.0", "PostgreSQL 15-alpine", "psycopg2-binary 2.9.9", "Docker", "Docker Compose", "GitHub Actions"]
cicd: true
github: "https://github.com/Liquenson/docker-devops-platform"
featured: false
iconPath: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
draft: false
metricas:
  - { label: "Docker Services", value: "2" }
  - { label: "API Endpoints", value: "2" }
  - { label: "Build Stages", value: "Multi-stage" }
  - { label: "Container User", value: "Non-root" }
highlights:
  - "Multi-stage Dockerfile: builder stage (pip install --user) → runtime slim without pip or setuptools — reduced CVE surface"
  - "PostgreSQL Alpine base: smaller image with fewer installed packages and lower vulnerability footprint"
  - "Non-root appuser in FastAPI container: least-privilege execution from the initial container design"
  - "Retry logic with exponential backoff: 5 retries with 2s delay for PostgreSQL connection on startup"
  - "CMD in JSON array form (correct PID 1): OS signals handled directly by Uvicorn, not by a shell wrapper"
  - "Health checks declared in Docker Compose with service dependencies"
  - "FastAPI + Uvicorn 0.30.0 ASGI: high performance with automatic OpenAPI documentation at /docs"
  - "CI verifies build + startup + health endpoint on every push before merge"
arquitectura:
  - { nombre: "FastAPI + Uvicorn", descripcion: "High-performance ASGI API with automatic OpenAPI documentation at /docs" }
  - { nombre: "PostgreSQL 15", descripcion: "Relational database in Docker container with named persistent volume" }
  - { nombre: "Docker Compose", descripcion: "Multi-service orchestration with declared health checks and inter-container dependencies" }
  - { nombre: "Multi-stage Build", descripcion: "Dependencies installed in builder stage; runtime image contains only what is needed to execute" }
  - { nombre: "GitHub Actions CI", descripcion: "Pipeline that builds, starts and verifies the /health endpoint on every commit" }
---

## Platform overview

A containerized FastAPI backend with PostgreSQL 15, documenting the design decisions that separate a container image that runs from one that is production-ready. Every decision in the Dockerfile addresses a specific failure mode: attack surface, startup ordering, process signal handling or operational observability.

## Container design

The Dockerfile implements a 19-line design with explicit reasoning for each directive:

**Multi-stage build** — the builder stage installs dependencies with `pip install --user`, placing them in `~/.local`. The runtime stage copies only that directory into the non-root user's home. No pip, no setuptools, no compilation tools in the runtime image. The primary benefit is reduced attack surface — an image without a package manager is harder to exploit for arbitrary package installation if the container is compromised.

**Non-root execution** — `useradd -m appuser` creates a user with no elevated privileges. `USER appuser` switches to that user before the application starts. If a vulnerability in FastAPI or Uvicorn allows arbitrary code execution, the attacker operates with the limited permissions of `appuser` rather than root.

**CMD array syntax** — `CMD ["uvicorn", "src.main:app", ...]` runs Uvicorn as PID 1 directly. The shell form of CMD wraps the command in `/bin/sh -c`, making the shell PID 1. Signals sent by Docker on `docker stop` (SIGTERM) reach the shell, which may not propagate them to the application. The array form ensures signals reach Uvicorn directly, enabling graceful shutdown.

## Health check design

The `/health` endpoint verifies active database connectivity:

```python
@app.get("/health")
def health():
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}
```

A health check that only confirms the process is running produces false positives. When the database connection pool is exhausted or the database is unreachable, the application cannot serve requests — but a process-level health check would report healthy. The active connection check exposes the actual service state.

## Startup ordering

Docker Compose `depends_on` confirms that the PostgreSQL container is in `running` state — not that PostgreSQL is accepting connections. PostgreSQL takes 2-4 seconds after container startup to initialize its data cluster. The application implements retry logic to handle this window:

5 attempts with 2-second intervals provide up to 10 seconds of grace before the application fails with a clear error message. This eliminates the crash loop that occurs when the application connects before PostgreSQL is ready.

## CI integration testing

The GitHub Actions pipeline verifies not just that the image builds, but that the full stack starts and communicates:

1. `docker build` — image compiles without errors
2. `docker compose up -d` — both services start
3. `curl -f http://localhost:8000/health` — application responds and database connection succeeds
4. `docker compose down` — cleanup

This integration test catches failures that unit tests cannot: a Dockerfile that builds but fails at runtime, missing environment variables, network configuration that prevents inter-container communication.

## Planned capabilities

- NGINX reverse proxy with rate limiting and security headers
- Automatic image push to ECR or GHCR in CI
- Kubernetes manifests for cluster deployment
- Prometheus metrics endpoint for operational observability
