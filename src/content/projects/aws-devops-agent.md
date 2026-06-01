---
titulo: "AWS DevOps Agent"
descripcion: "CLI agent powered by Claude Sonnet 4.6 with 31 boto3 tools for natural language AWS infrastructure operations. Security group auditing, IAM key rotation, cost analysis, CloudWatch logs and management of EC2, ECS, EKS, RDS, Lambda and 20+ additional services."
fecha: 2026-05-01
categoria: "AI + Cloud Operations"
madurez: "In Development"
stack: ["Python 3.11", "Claude Sonnet 4.6", "Anthropic SDK", "boto3", "python-dotenv", "AWS", "GuardDuty", "Cost Explorer", "CloudWatch"]
cicd: false
github: "https://github.com/Liquenson/aws-devops-agent"
featured: true
iconPath: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
draft: false
metricas:
  - { label: "AWS Services", value: "31+" }
  - { label: "Claude Tools", value: "31" }
  - { label: "Interface", value: "Natural language" }
  - { label: "Model", value: "Claude Sonnet 4.6" }
highlights:
  - "31 active boto3 clients: EC2, S3, RDS, EKS, ECS, Lambda, IAM, CloudWatch, ECR, DynamoDB, ElastiCache, SNS, SQS, CloudFormation, Route53, API Gateway, CodePipeline, CodeBuild, CloudFront, SSM, EventBridge, GuardDuty and more"
  - "Security group auditing: detects critical ports open to 0.0.0.0/0 (22, 3306, 5432, 27017, 6379, 3389) with HIGH/MEDIUM risk classification"
  - "IAM access key rotation: identifies keys over 90 days without rotation with automatic risk classification"
  - "Cost analysis via Cost Explorer ordered by service: breaks down real monthly spend in USD"
  - "CloudWatch logs in real time: last N minutes from any log group with timestamps"
  - "Explicit confirmation before executing destructive operations (stop/terminate instances)"
arquitectura:
  - { nombre: "Claude Sonnet 4.6", descripcion: "Reasoning layer that interprets natural language queries and selects which tools to invoke" }
  - { nombre: "Tool Use (Function Calling)", descripcion: "31 tools defined as JSON schemas that map to real AWS operations via boto3" }
  - { nombre: "boto3", descripcion: "AWS SDK for Python executing operations against the real account" }
  - { nombre: "Anthropic SDK", descripcion: "Client for the Claude API with multi-turn conversation state management" }
  - { nombre: "AWS IAM", descripcion: "Local credentials with least-privilege principle scoped to permitted operations" }
---

## Platform overview

A CLI agent that accepts natural language queries about AWS infrastructure and executes the appropriate boto3 operations to answer them. Claude Sonnet 4.6 is the reasoning layer — it selects which AWS operations to perform based on the query, evaluates results, and synthesizes a structured response. boto3 is the execution layer.

The architecture uses Claude's tool-use pattern: AWS operations are defined as JSON schemas. Claude selects one or more tools, the agent executes them via boto3, and returns results to Claude for interpretation. Claude can chain operations when the answer requires data from multiple sources.

## Operational capabilities

**Security auditing** — the security group audit tool scans all security groups in the account for rules with CIDR `0.0.0.0/0`. Ports 22 (SSH), 3306, 5432, 27017, 6379 and 3389 are classified as HIGH risk. All others as MEDIUM. Results include the security group ID, name and a specific remediation recommendation.

**IAM key hygiene** — the IAM key age tool retrieves all access keys across all IAM users and calculates age in days. Keys over 90 days are classified as HIGH risk. The result surfaces which users have aged credentials that should be rotated.

**Cost visibility** — Cost Explorer queries the current month's spend grouped by service. Results are sorted descending by cost. Services under $0.01 are excluded. The output shows the distribution of spend across EC2, RDS, CloudFront, S3 and other active services.

**Log access** — CloudWatch log queries retrieve the last N minutes of log events from any log group. Useful during incident response when the alternative is navigating the CloudWatch console while simultaneously managing an incident.

**Fleet state** — EC2 instance listing projects four fields: instance ID, type, state and public IP. The raw API response contains dozens of fields. Projecting only the operationally relevant fields keeps responses within context window bounds for long conversations.

## Tool design

Each tool's `description` field determines when Claude invokes it. Ambiguous descriptions produce incorrect tool selection. The description must be precise enough that Claude can distinguish between `audit_security_groups` (scans for open rules) and `describe_security_group` (returns details of a specific group).

The dispatch function maps tool names to Python callables:

```python
def execute_tool(name: str, inputs: dict) -> dict:
    dispatch = {
        "list_ec2_instances":      list_ec2_instances,
        "audit_security_groups":   audit_security_groups,
        "get_cost_by_service":     get_cost_by_service,
        "get_cloudwatch_logs":     lambda: get_logs(inputs["log_group"], inputs.get("minutes", 60)),
    }
    fn = dispatch.get(name)
    return fn() if fn else {"error": f"Unknown tool: {name}"}
```

Every boto3 function returns a structured error dict rather than raising an exception. If a function raises an unhandled exception, the agent loop breaks. If it returns `{"error": "message"}`, Claude interprets and communicates it to the user.

## Known constraints

The agent is stateless. Each session starts from scratch with no memory of previous sessions. Operational context built during one conversation — which instances are running, what cost anomalies were identified — does not carry forward.

Destructive action confirmation is handled at the system prompt level. Before executing `stop_instances` or similar operations, Claude states the exact resource and action and waits for explicit confirmation. This is operationally sufficient for the current use case; a production deployment would implement confirmation at the code level.

Cost Explorer requires the boto3 client to be configured with `region_name="us-east-1"` regardless of where the infrastructure runs. Configuring it with any other region produces silent failures at query time.
