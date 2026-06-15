---
titulo: "linux-fleet-manager"
descripcion: "Bash automation tool for mass Linux server management — deploy, configuration and maintenance at infrastructure scale. SSH-based operations, ShellCheck validated, idempotent scripts following Red Hat engineering standards."
fecha: 2026-06-13
categoria: "DevOps Automation"
madurez: "Production"
featured: false
github: "https://github.com/lra-cloud-ops/linux-fleet-manager"
cicd: false
draft: false

categoria_es: "Automatización DevOps"
madurez_es: "Producción"
descripcion_es: "Herramienta Bash para gestión masiva de servidores Linux — despliegue, configuración y mantenimiento a escala de infraestructura. Operaciones vía SSH, validadas con ShellCheck, scripts idempotentes siguiendo estándares de ingeniería Red Hat."
metricas_es:
  - label: "SSH — sin agentes"
    value: "Interfaz"
  - label: "ShellCheck obligatorio"
    value: "Validación"
  - label: "Idempotente — seguro re-ejecutar"
    value: "Scripts"
  - label: "Ingeniería Red Hat"
    value: "Estándares"
highlights_es:
  - "Gestión masiva de servidores vía SSH — sin agentes ni daemons requeridos"
  - "Validación CI con ShellCheck — cada script linteado antes del despliegue"
  - "Scripts idempotentes — seguros para ejecutar múltiples veces sin efectos secundarios"

flow_steps:
  - label: "Bash"
    sublabel: "Automation"
    icon: "gnubash"
  - label: "SSH"
    sublabel: "Agentless"
  - label: "ShellCheck"
    sublabel: "Linting"
  - label: "Linux"
    sublabel: "Fleet"
    icon: "linux"

stack:
  - "Bash"
  - "SSH"
  - "ShellCheck"
  - "Linux"
  - "CI/CD"
metricas:
  - label: "Interface"
    value: "SSH — no agents required"
  - label: "Validation"
    value: "ShellCheck enforced"
  - label: "Scripts"
    value: "Idempotent — safe to re-run"
  - label: "Standards"
    value: "Red Hat engineering"
highlights:
  - "Mass server management via SSH — no agents or daemons required"
  - "ShellCheck CI validation — every script linted before deployment"
  - "Idempotent scripts — safe to run multiple times without side effects"
  - "Red Hat engineering standards — set -euo pipefail throughout"
  - "Covers deploy, configuration and maintenance workflows at scale"
---

## Overview

`linux-fleet-manager` is a Bash automation tool for managing Linux server fleets at scale. Operations are performed via SSH — no agents or daemons required on target hosts. Every script is ShellCheck validated and idempotent, following Red Hat engineering standards throughout.

The tool covers the three core fleet management workflows: deploy (push artifacts and start services), configuration (set system parameters, install packages, manage users) and maintenance (updates, health checks, cleanup).

**Organization:** [LRA Cloud Operations](https://lracloudops.com)
**Repository:** [github.com/lra-cloud-ops/linux-fleet-manager](https://github.com/lra-cloud-ops/linux-fleet-manager)

---

## Key Engineering Decisions

**Why SSH instead of agents:** SSH is available on every Linux server by default. No agent installation, no port management, no additional attack surface. Operations are stateless and auditable via SSH logs.

**Why ShellCheck:** ShellCheck catches common Bash errors before they reach production. Running ShellCheck in CI means every script is validated automatically — not just when a developer remembers to check.

**Why idempotent scripts:** Running a script twice should produce the same result as running it once. This makes re-runs safe after failures and enables fleet-wide operations without tracking per-host state.

**Why Red Hat engineering standards:** `set -euo pipefail` stops execution on any error. Centralized variables prevent duplication. Numbered step logging makes output readable. These patterns come from decades of enterprise Linux operations.

---

## Key Learnings

**What worked:** ShellCheck in CI eliminated an entire class of subtle Bash issues (unquoted variables, missing error handling) before they ever reached a server. The zero-false-positive policy on ShellCheck warnings kept the signal-to-noise ratio high.

**What we learned:** CSV and JSON output formats require consistent field ordering from the start — retrofitting output format consistency after building all the collection modules required touching every function. Design the output contract before the collection logic.

**What we'd improve:** Adding a `--dry-run` flag from the beginning rather than after the fact — operators consistently asked for it before running fleet-wide operations on production servers.
