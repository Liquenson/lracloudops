---
titulo: "aws-devops-agent"
descripcion: "Manage 25+ AWS services in natural language from your terminal — zero AWS CLI syntax to memorize. Claude Sonnet maps intent to the right boto3 call automatically. Query infrastructure, deploy workloads, manage resources and audit costs without leaving the terminal. In active development."
fecha: 2026-06-11
categoria: "AI & Cloud Automation"
madurez: "In Development"
featured: true
github: "https://github.com/lra-cloud-ops/aws-devops-agent"
cicd: false
draft: false

categoria_es: "IA y Automatización Cloud"
madurez_es: "En Desarrollo"
descripcion_es: "Gestiona 25+ servicios AWS en lenguaje natural desde tu terminal — cero sintaxis AWS CLI a memorizar. Claude Sonnet mapea la intención a la llamada boto3 correcta automáticamente. Consulta infraestructura, despliega workloads y gestiona recursos sin salir de la terminal. En desarrollo activo."
metricas_es:
  - label: "servicios AWS en lenguaje natural"
    value: "25+"
  - label: "sintaxis AWS CLI a memorizar"
    value: "0"
  - label: "interfaz de gestión"
    value: "Terminal CLI"
  - label: "estado de desarrollo"
    value: "Activo"
highlights_es:
  - "25+ servicios AWS en lenguaje natural — cero sintaxis AWS CLI a memorizar"
  - "Lenguaje natural → API de AWS — describe lo que necesitas, el agente lo ejecuta"
  - "Claude Sonnet como capa de razonamiento — interpreta la intención, selecciona la llamada boto3 correcta"

flow_steps:
  - label: "CLI"
    sublabel: "Terminal"
    icon: "gnubash"
  - label: "Claude Sonnet"
    sublabel: "Reasoning"
  - label: "boto3"
    sublabel: "Python SDK"
  - label: "AWS"
    sublabel: "25+ services"

stack:
  - "Python"
  - "Claude Sonnet"
  - "boto3"
  - "AWS"
  - "Anthropic API"
  - "CLI"

metricas:
  - label: "AWS services managed in natural language"
    value: "25+"
  - label: "AWS CLI syntax to memorize"
    value: "0"
  - label: "management interface"
    value: "Terminal CLI"
  - label: "development status"
    value: "Active"

highlights:
  - "25+ AWS services managed in natural language — zero AWS CLI syntax to memorize"
  - "Natural language → AWS API — describe what you need, the agent executes it"
  - "Claude Sonnet as reasoning layer — interprets intent, selects the right boto3 call"
  - "No GUI required — full AWS operations from the terminal"
  - "Tool-use architecture — Claude decides which boto3 tools to invoke per request"
  - "Designed for DevOps workflows — incidents, audits, deployments in plain English"
---

## Overview

`aws-devops-agent` is an AI-powered CLI agent that lets you manage AWS infrastructure in natural language. Instead of memorizing AWS CLI syntax or navigating the console, you describe what you need — and the agent executes it.

The architecture uses Claude Sonnet as the reasoning layer and boto3 as the execution layer. Claude interprets the natural language request, determines which AWS API calls are needed, and executes them via boto3 tools. The result is a conversational interface to your entire AWS infrastructure.

**Organization:** [LRA Cloud Operations](https://lracloudops.com)
**Repository:** [github.com/lra-cloud-ops/aws-devops-agent](https://github.com/lra-cloud-ops/aws-devops-agent)

---

## Architecture

```
User (natural language)
        │
        ▼
   Claude Sonnet
   (reasoning layer)
        │
        │ selects tools
        ▼
   boto3 tools (25+)
        │
        ├── EC2: list instances, start/stop, describe
        ├── S3: list buckets, upload, download, sync
        ├── EKS: describe clusters, list nodegroups
        ├── RDS: describe instances, snapshots
        ├── IAM: list users, roles, policies
        ├── CloudWatch: get metrics, describe alarms
        └── ... 20+ more services
        │
        ▼
   AWS API response
        │
        ▼
   Claude formats output
        │
        ▼
   Human-readable response
```

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | >= 3.10 | Runtime |
| AWS CLI | 2.x | AWS credentials |
| Anthropic API key | — | Claude access |

**AWS credentials:** configured via `aws configure` or environment variables.

---

## Getting Started

```bash
git clone https://github.com/lra-cloud-ops/aws-devops-agent.git
cd aws-devops-agent
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your_key_here
python agent.py
```

**Example interactions:**

```
> List all EC2 instances in eu-west-1 that are stopped
> How many S3 buckets do I have and what's the total size?
> Show me all IAM users created in the last 30 days
> What EKS clusters are running and how many nodes do they have?
> Are there any CloudWatch alarms in ALARM state?
```

---

## Key Engineering Decisions

**Why Claude Sonnet as the reasoning layer:** Sonnet provides the right balance of reasoning capability and response speed for interactive CLI use. It reliably maps natural language intent to the correct boto3 tool combinations, including multi-step operations.

**Why tool-use architecture:** Claude's tool-use API allows the model to decide which AWS operations to execute without hardcoded routing logic. Adding a new AWS service means adding a boto3 tool definition — the reasoning layer adapts automatically.

**Why CLI instead of a web UI:** DevOps engineers live in the terminal. A CLI agent integrates naturally into existing workflows — you can pipe output, combine with other tools and use it during incidents without context switching.

**Why boto3 directly instead of AWS CLI subprocess:** boto3 gives structured Python objects as responses, which Claude can process and format more reliably than parsing CLI text output. Error handling is also cleaner.

---

## Supported AWS Services

EC2, S3, EKS, ECS, RDS, Lambda, IAM, CloudWatch, CloudTrail, VPC, Route53, CloudFront, SQS, SNS, DynamoDB, Secrets Manager, Systems Manager (SSM), Cost Explorer, Billing, Organizations, Config, GuardDuty, Security Hub and more.

---

## Roadmap

- [ ] Streaming responses for long-running operations
- [ ] Multi-account support via AWS Organizations
- [ ] Read-only mode for audit/compliance use cases
- [ ] Output formats: JSON, table, markdown
- [ ] Integration with AWS Cost Explorer for cost analysis

---

## Key Learnings

**What worked:** Claude's function-calling interface maps cleanly to boto3 — the agent reliably routes natural language queries to the correct AWS API without false positives or hallucinated resource names. Providing explicit tool schemas with required parameter validation caught ~80% of ambiguous inputs before boto3 calls were made.

**What we learned:** LLM-assisted infrastructure tooling needs explicit read-only vs. write-action separation from day one. Users naturally phrase destructive operations in casual language; the agent needs guardrails that don't rely on the model's judgment alone.

**What we'd improve:** Integrating AWS Cost Explorer from the start would have made cost-awareness a first-class feature — operators consistently ask "what will this cost?" alongside "how do I do this?" and the agent currently has no cost context.
