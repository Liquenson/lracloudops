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
