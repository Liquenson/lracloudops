---
titulo: "Python CI/CD Starter"
descripcion: "Production-ready Flask REST API starter with integrated DevOps from the first commit. Three-stage pipeline: flake8 with explicit error selectors, pytest with 80% coverage enforcement, and Docker build with container health check verification."
fecha: 2026-05-01
categoria: "Templates"
madurez: "Starter"
stack: ["Python 3.11", "Flask 3.0.3", "pytest 8.2.2", "pytest-cov 5.0.0", "flake8 7.1.0", "Docker", "GitHub Actions"]
cicd: true
github: "https://github.com/Liquenson/python-cicd-template"
featured: false
iconPath: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
draft: false
metricas:
  - { label: "Pipeline Stages", value: "3" }
  - { label: "Coverage Gate", value: "80%" }
  - { label: "Docker Tag", value: "git SHA deterministic" }
  - { label: "Max Complexity", value: "10 per function" }
highlights:
  - "3-stage pipeline: Stage 1 (flake8 + pytest --cov 80%) → Stage 2 (Docker build git.sha + health check) → Stage 3 (configurable deploy)"
  - "flake8 with explicit selectors E9/F63/F7/F82 and max-complexity=10: blocking errors, not advisory warnings"
  - "80% coverage threshold enforced before image build: quality gate prevents untested code from reaching a container"
  - "Deterministic Docker tag with github.sha: exact traceability between image artifact and the commit that produced it"
  - "Docker build gated to main branch: container health check only runs on production branch pushes"
  - "debug=False in production: Flask does not expose stack traces or the interactive debugger"
  - "Three reference endpoints ready to replace with microservice business logic"
arquitectura:
  - { nombre: "Flask 3.0.3", descripcion: "Python micro-framework with declarative routing and minimal surface area" }
  - { nombre: "flake8 7.1", descripcion: "PEP8 linter that catches style violations and potential runtime errors as a build gate" }
  - { nombre: "pytest + pytest-cov", descripcion: "Test framework with integrated coverage reporting and threshold enforcement" }
  - { nombre: "Docker multi-stage", descripcion: "Two-stage build: dependencies in builder stage, runtime-only in final image" }
  - { nombre: "GitHub Actions", descripcion: "3-stage sequential CI pipeline: lint+test → build+healthcheck → deploy" }
---

## Platform overview

A production-ready starting point for Python microservices with quality gates and CI/CD pre-configured. The pipeline enforces lint, test coverage and container health before any code reaches a deployment target. Teams clone the repository, replace the reference endpoints with business logic, and operate a service with a functioning CI/CD pipeline from the first commit.

The largest hidden cost when starting a Python service is configuring quality tooling correctly. Linting configurations added after the fact encounter accumulated violations. Coverage thresholds introduced after code is written are often set to whatever the current coverage happens to be. This starter configures those gates at the origin.

## Pipeline architecture

```
Lint (flake8) → Test (pytest --cov) → Build (docker) → Health Check
```

Each stage is a prerequisite for the next. A linting failure prevents test execution. A coverage threshold miss prevents the image build. A failed image build prevents the health check. The pipeline fails at the earliest detectable defect.

The health check stage runs only on push to `main`: the container starts and `curl http://localhost:5000/health` must return 200. This catches container startup failures — import errors at runtime, missing required environment variables, port conflicts in the CI runner — that unit tests cannot detect.

## Reference endpoints

```python
GET /           → {"status": "running", "service": "mi-proyecto"}
GET /health     → {"status": "healthy"}
GET /items/<id> → {"id": 1, "name": "Item 1", "price": 10.99}
```

The `/health` endpoint is the only one that must be preserved. The remaining endpoints are replacement targets for actual microservice logic.

## flake8 configuration

The configuration applies PEP8 with a maximum line length of 88 characters, compatible with Black if added later. The error selectors are explicit:

- `E9` — runtime errors (syntax errors, import failures)
- `F63` — invalid escape sequences and star imports
- `F7` — syntax errors in annotations
- `F82` — undefined names

`max-complexity=10` enforces cyclomatic complexity per function. Functions exceeding this threshold indicate logic that should be decomposed. Style violations are blocking — the pipeline does not proceed past a flake8 failure.

## docker build safety

The image tag uses `github.sha` — the exact commit hash that triggered the pipeline run. This creates a deterministic mapping between every running container image and the source commit that produced it. Rollback is selecting the previous SHA tag; the image already exists in the registry.

`debug=False` is enforced in the production configuration. Flask's debug mode enables an interactive WSGI debugger accessible over HTTP — a remote code execution vector when exposed. The starter ships with debug disabled in the production path.

## Known constraint

The starter uses Python 3.11 and Flask 3.0.3. The pipeline runs on GitHub Actions with a standard Ubuntu runner. No secrets management, database connectivity or service discovery is included — those are service-specific concerns that belong in the consuming repository, not the starter itself.
