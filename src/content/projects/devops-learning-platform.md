---
titulo: "DevOps Learning Platform"
titulo_es: "Plataforma de Aprendizaje DevOps"
descripcion: "Comprehensive DevOps training platform covering Terraform AWS infrastructure, the full HashiCorp stack (Vault, Consul, Nomad), a 12-module Bash scripting course and Docker environments with Azure CLI and AzCopy."
descripcion_es: "Plataforma integral de formación DevOps con infraestructura Terraform en AWS, stack HashiCorp completo (Vault, Consul, Nomad), curso de Bash en 12 módulos y entornos Docker con Azure CLI y AzCopy."
highlights_es:
  - "Infraestructura Terraform AWS: VPC, IGW, NAT Gateway, subnets, route tables — completamente declarativa"
  - "Stack HashiCorp completo: Vault para secretos, Consul para service mesh, Nomad para orquestación de workloads"
  - "Curso de scripting Bash en 12 módulos con ejercicios progresivos — desde fundamentos hasta automatización avanzada"
  - "Entorno Docker con Azure CLI y AzCopy para flujos de trabajo híbridos AWS/Azure"
fecha: 2026-05-01
categoria: "Platform Engineering"
madurez: "Production"
stack: ["Terraform", "HashiCorp Vault", "HashiCorp Consul", "Nomad", "Bash", "Docker", "Azure CLI", "AzCopy", "AWS"]
cicd: false
github: "https://github.com/Devopsmcpatral/Devops"
featured: false
iconPath: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
draft: false
metricas:
  - { label: "Bash Modules", value: "12" }
  - { label: "HashiCorp Tools", value: "3 (Vault, Consul, Nomad)" }
  - { label: "Cloud Providers", value: "AWS + Azure" }
  - { label: "Author", value: "Kelvin Osaigbovo" }
outcomes:
  - "Full HashiCorp stack running in a single environment: Vault, Consul and Nomad coordinated"
  - "Terraform AWS network layer: VPC with public/private subnets, IGW, NAT Gateway and route tables"
  - "12-module Bash course: from variables to advanced automation patterns"
  - "Hybrid cloud environment: Docker container with Azure CLI and AzCopy pre-configured"
highlights:
  - "Terraform AWS: VPC, IGW, NAT Gateway, subnets and route tables — full network layer as code"
  - "HashiCorp full stack: Vault secrets management, Consul service mesh, Nomad workload orchestration"
  - "12-module Bash scripting course with progressive exercises — variables, functions, loops, error handling"
  - "Docker environment with Azure CLI and AzCopy pre-installed for hybrid AWS/Azure workflows"
arquitectura:
  - { nombre: "Terraform AWS Network", descripcion: "VPC with public/private subnets, Internet Gateway, NAT Gateway and route tables — reproducible from a single apply" }
  - { nombre: "HashiCorp Vault", descripcion: "Secrets management: dynamic secrets, policies and audit logging — eliminates hardcoded credentials" }
  - { nombre: "HashiCorp Consul", descripcion: "Service mesh with health checking, service discovery and KV store for distributed configuration" }
  - { nombre: "Nomad Orchestration", descripcion: "Lightweight workload orchestrator for containers and batch jobs — complements Consul service discovery" }
  - { nombre: "Bash Scripting Course", descripcion: "12 progressive modules from shell fundamentals to production automation scripts" }
  - { nombre: "Docker Azure Environment", descripcion: "Pre-built container image with Azure CLI and AzCopy for hybrid cloud operations" }
---

## Platform overview

A hands-on DevOps learning platform authored by Kelvin Osaigbovo, covering the full HashiCorp ecosystem alongside Terraform AWS infrastructure and a structured Bash scripting curriculum. Built for engineers who need practical, runnable implementations rather than theoretical walkthroughs.

The platform is structured around four learning tracks: AWS networking with Terraform, the HashiCorp stack (Vault, Consul, Nomad), Bash scripting fundamentals to advanced, and hybrid cloud tooling with Azure CLI and Docker.

## Terraform AWS infrastructure

The network layer is implemented as Terraform code covering all fundamental AWS networking primitives:

- **VPC** — isolated network with configurable CIDR
- **Subnets** — public and private subnet pairs across availability zones
- **Internet Gateway** — outbound internet access for public subnets
- **NAT Gateway** — outbound internet for private subnet workloads without inbound exposure
- **Route Tables** — explicit routing rules for public and private traffic paths

Every resource is declared. No resource exists without a corresponding Terraform definition.

## HashiCorp full stack

Three HashiCorp tools work together as a cohesive platform:

**Vault** manages secrets. Dynamic secrets, access policies and audit logging eliminate the pattern of static credentials embedded in application code or CI/CD pipelines.

**Consul** provides service discovery and a service mesh. Services register with Consul, health checks run continuously, and the KV store handles distributed configuration without a separate configuration management system.

**Nomad** orchestrates workloads. Lightweight compared to Kubernetes, Nomad runs containers and batch jobs and integrates natively with Consul for service discovery and Vault for secret injection.

The three tools are designed to operate together: Nomad integrates with Consul for service registration and with Vault for runtime secret retrieval. Running all three in the same environment demonstrates how the full HashiCorp stack coordinates.

## Bash scripting curriculum

The 12-module course progresses from shell fundamentals to production-grade automation:

- Variables, quoting and parameter expansion
- Conditionals, loops and flow control
- Functions and local scope
- File and directory operations
- Process management and signals
- Input validation and error handling
- Scripting patterns for DevOps automation

Each module includes exercises with expected outputs, allowing self-paced progression and verification.

## Hybrid cloud environment

A Docker image pre-configured with Azure CLI and AzCopy addresses the reality that most production environments span multiple cloud providers. Engineers working in AWS environments frequently need to interact with Azure storage, Active Directory, or Azure DevOps pipelines. The containerized environment provides a consistent, version-pinned toolset without per-machine installation.

## Why this matters

The combination of Terraform, HashiCorp stack and Bash in a single repository reflects how production platform teams actually operate: IaC for infrastructure, a secrets/mesh/orchestration layer for operations, and shell scripting as the glue that holds automation workflows together. The Azure CLI environment acknowledges that AWS-primary shops still interact with Azure services.
