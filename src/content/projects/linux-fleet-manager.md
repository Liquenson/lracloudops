---
titulo: "linux-fleet-manager"
descripcion: "Agentless fleet management at scale — SSH only, zero agents required on target hosts. 100% of scripts ShellCheck-validated in CI across Ubuntu, macOS and Windows Git Bash. Idempotent design makes fleet-wide operations safe to re-run on any host without side effects."
fecha: 2026-06-13
categoria: "DevOps Automation"
madurez: "Production"
featured: false
github: "https://github.com/lra-cloud-ops/linux-fleet-manager"
cicd: false
draft: false

categoria_es: "Automatización DevOps"
madurez_es: "Producción"
descripcion_es: "Gestión de flotas a escala sin agentes — solo SSH, cero agentes en hosts objetivo. 100% de scripts validados con ShellCheck en CI en Ubuntu, macOS y Windows Git Bash. Diseño idempotente: las operaciones de flota son seguras para re-ejecutar en cualquier host sin efectos secundarios."
metricas_es:
  - label: "agentes requeridos en hosts objetivo"
    value: "0"
  - label: "scripts validados con ShellCheck en CI"
    value: "100%"
  - label: "plataformas CI (Ubuntu, macOS, Windows)"
    value: "3 OS"
  - label: "re-ejecución segura en cualquier host"
    value: "Idempotente"
highlights_es:
  - "Cero agentes requeridos en hosts objetivo — solo SSH, gestión de flotas sin agentes a escala"
  - "100% de scripts validados con ShellCheck en CI en Ubuntu, macOS y Windows Git Bash"
  - "Scripts idempotentes — seguros para re-ejecutar en cualquier host sin efectos secundarios"

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
  - label: "agents required on target hosts"
    value: "0"
  - label: "scripts ShellCheck-validated in CI"
    value: "100%"
  - label: "CI platforms (Ubuntu, macOS, Windows)"
    value: "3 OS"
  - label: "safe to re-run on any host"
    value: "Idempotent"
highlights:
  - "Zero agents required on target hosts — SSH only, agentless fleet management at scale"
  - "100% of scripts ShellCheck-validated in CI across Ubuntu, macOS and Windows Git Bash"
  - "Idempotent scripts — safe to re-run on any host multiple times without side effects"
  - "Red Hat engineering standards — set -euo pipefail throughout"
  - "Covers deploy, configuration and maintenance workflows at infrastructure scale"
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
