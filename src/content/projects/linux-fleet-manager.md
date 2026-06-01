---
titulo: "Linux Fleet Manager"
descripcion: "Bash automation framework for Linux fleet inventory collection. Cross-platform with set -euo pipefail hardening, SSH BatchMode for remote hosts, TTY detection for terminal vs pipeline execution and structured CSV/JSON output."
fecha: 2026-05-01
categoria: "SRE & Automation"
madurez: "Production"
stack: ["Bash 4.0+", "ShellCheck", "SSH", "CSV / JSON", "GitHub Actions", "Ubuntu", "macOS", "Windows Git Bash"]
cicd: true
github: "https://github.com/Liquenson/linux-fleet-manager"
featured: false
iconPath: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
draft: false
metricas:
  - { label: "CI Platforms", value: "3" }
  - { label: "Output Formats", value: "CSV + JSON" }
  - { label: "Version", value: "v2.1.0" }
  - { label: "Validation", value: "ShellCheck 0 errors" }
highlights:
  - "set -euo pipefail across all scripts: immediate failure on errors, undeclared variables and failed pipes"
  - "Anti-re-sourcing guard in lib/common.sh: prevents double initialization in complex pipelines"
  - "Automatic TTY detection: ANSI colors in interactive terminal, clean output in pipes and log files"
  - "Cross-platform CPU detection: Linux (/proc/cpuinfo), macOS (sysctl) and Windows (NUMBER_OF_PROCESSORS)"
  - "Enterprise-grade SSH: BatchMode=yes and ConnectTimeout=10 for remote host inventory without hanging"
  - "Robust argument parsing: --format csv|json, --servers, --help with N/A fallbacks instead of crash"
  - "Multi-platform CI/CD: ShellCheck on Ubuntu, macOS and Windows Git Bash in parallel"
  - "Dual CSV/JSON export ready for CMDB import, dashboards or programmatic processing"
arquitectura:
  - { nombre: "server-inventory.sh", descripcion: "Main script: collects system data locally or via SSH on remote hosts" }
  - { nombre: "lib/common.sh", descripcion: "Shared library: terminal colors, logging, reusable error handling functions" }
  - { nombre: "lib/logger.sh", descripcion: "Structured logging with INFO, WARN and ERROR levels" }
  - { nombre: "ShellCheck CI", descripcion: "Static analysis of all Bash scripts across three operating systems in parallel" }
  - { nombre: "reports/", descripcion: "Timestamped output directory: server-inventory_TIMESTAMP.(csv|json)" }
---

## Platform overview

A Bash automation framework for collecting infrastructure inventory from Linux fleets without external dependencies, SaaS tooling or agents installed on remote hosts. A single command generates a structured inventory of local or remote servers in CSV or JSON format, ready for import into CMDBs, dashboards or monitoring systems.

The framework follows the UNIX principle of doing one thing reliably. The main script orchestrates data collection and delegates all reusable logic — logging, error handling, output formatting — to shared libraries in `lib/`.

## Design decisions

**`set -euo pipefail`** is applied to every script. This combination ensures: the script exits immediately on any command failure (`-e`), treats references to undeclared variables as errors (`-u`), and propagates pipe failures rather than masking them with the exit code of the last command (`-o pipefail`). Without these settings, a failed command in a complex pipeline can be silently ignored.

**SSH BatchMode** — remote host inventory uses `SSH BatchMode=yes ConnectTimeout=10`. BatchMode prevents SSH from prompting for interactive input (password, host key confirmation) in a non-interactive context, which would cause the script to hang indefinitely. ConnectTimeout bounds the wait for unreachable hosts.

**TTY detection** — the library detects whether output is going to an interactive terminal or a pipe/file, and enables ANSI color codes only in the interactive case. Log files and downstream processes receive clean, parseable output.

**Cross-platform CPU detection** — Linux, macOS and Windows Git Bash expose CPU count through different interfaces. The script detects the operating system and uses the appropriate source: `/proc/cpuinfo` on Linux, `sysctl -n hw.ncpu` on macOS, `$NUMBER_OF_PROCESSORS` on Windows.

**Anti-re-sourcing guard** — `lib/common.sh` checks whether it has already been sourced before executing initialization. In complex automation pipelines where multiple scripts source the same library, double initialization produces duplicate function definitions and unpredictable behavior.

## Output

Reports are written to `reports/` with timestamps in the filename:

```bash
# Local inventory
./scripts/inventory/server-inventory.sh --format csv
./scripts/inventory/server-inventory.sh --format json

# Output: reports/server-inventory_20260601_143022.csv
```

Timestamped output creates a historical record of fleet state changes over time without overwriting previous reports.

## CI validation

GitHub Actions runs ShellCheck on Ubuntu, macOS and Windows Git Bash in parallel. The pipeline fails with zero tolerance for ShellCheck warnings. This CI configuration catches cross-platform compatibility issues that only surface on specific shell versions — Bash on macOS ships as version 3.2 (for licensing reasons) and has meaningful differences from Bash 4.0+ on Linux.

ShellCheck catches common shell scripting errors: unquoted variable expansions, incorrect array handling, commands that can fail silently, and portability issues between shell versions. Running it across three platforms on every push ensures the scripts work in any environment with Bash 4.0+.
