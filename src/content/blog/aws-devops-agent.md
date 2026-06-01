---
titulo: "Building a Natural Language AWS Operations Agent with Claude and boto3"
descripcion: "Architecture of the AWS DevOps Agent: Claude Sonnet 4.6 as the reasoning layer, 31 boto3 tools as the execution layer, and the engineering decisions that determine whether a tool-use agent is operationally useful."
fecha: 2026-05-05
tags: ["AI", "AWS", "Python", "DevOps", "Claude", "boto3", "Agentes"]
draft: false
---

## Problem

Answering the question "what is the current state of the infrastructure?" requires opening multiple consoles, running a dozen AWS CLI commands, parsing raw JSON and synthesizing the state of multiple services mentally. Under normal conditions this takes minutes. During an incident, those minutes have operational cost.

The question was whether a natural language interface over AWS APIs could reduce that operational overhead — not as a replacement for understanding the infrastructure, but as a way to query it without context-switching through multiple tools.

## Context

The AWS DevOps Agent is a CLI tool written in Python that uses Claude Sonnet 4.6 as the reasoning layer and boto3 as the execution layer. A user types a question in natural language. Claude selects which AWS operations to perform, the agent executes them via boto3, and Claude synthesizes the results into a structured response.

The architectural constraint that makes this useful rather than a demo: Claude does not execute Python directly. It selects tools defined as JSON schemas, the agent executes them, and returns results to Claude for interpretation. This tool-use pattern allows Claude to chain multiple operations, evaluate intermediate results, and decide whether additional data is needed before responding.

## Architecture

Three layers:

```
User (natural language)
        ↓
Claude Sonnet 4.6 (reasoning + tool selection)
        ↓
boto3 (execution against the AWS account)
        ↓
Synthesized response
```

The agent loop runs until Claude reaches a conclusion:

```python
def run_agent(query: str) -> str:
    messages = [{"role": "user", "content": query}]
    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            tools=tools,
            system=SYSTEM_PROMPT,
            messages=messages
        )
        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result)
                    })
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        elif response.stop_reason == "end_turn":
            return extract_text(response.content)
```

The loop continues while Claude requires tool execution. When Claude has sufficient information, it terminates and returns the final response.

## Implementation

### Client initialization

All 31 boto3 clients initialize at agent startup, not on each tool invocation:

```python
REGION = "eu-west-1"

ec2     = boto3.client("ec2",       region_name=REGION)
ecs     = boto3.client("ecs",       region_name=REGION)
eks     = boto3.client("eks",       region_name=REGION)
rds     = boto3.client("rds",       region_name=REGION)
lmb     = boto3.client("lambda",    region_name=REGION)
logs    = boto3.client("logs",      region_name=REGION)
iam     = boto3.client("iam")                            # global service
s3      = boto3.client("s3")                             # global service
ce      = boto3.client("ce", region_name="us-east-1")   # Cost Explorer: us-east-1 only
gd      = boto3.client("guardduty", region_name=REGION)
```

Two non-obvious constraints: IAM and S3 are global services with no region requirement. Cost Explorer only accepts requests from `us-east-1` regardless of where the infrastructure runs — configuring it with any other region causes silent failures that surface only when the cost query executes.

### Tool schema design

Each tool is defined as a JSON schema that Claude uses to determine when and how to invoke it:

```python
tools = [
    {
        "name": "audit_security_groups",
        "description": "Detects security groups with rules open to 0.0.0.0/0. Classifies risk by port: SSH/RDP/database ports are HIGH risk.",
        "input_schema": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_cloudwatch_logs",
        "description": "Returns recent log events from a CloudWatch log group",
        "input_schema": {
            "type": "object",
            "properties": {
                "log_group": {"type": "string", "description": "The log group name"},
                "minutes": {"type": "integer", "description": "Number of minutes of history to return", "default": 60}
            },
            "required": ["log_group"]
        }
    }
]
```

The description field is operationally critical. Claude infers when to use each tool from the name and description — not from the Python implementation. Ambiguous descriptions produce incorrect tool selection. Time spent writing precise, unambiguous tool descriptions reduces incorrect behavior in production.

### Security group auditing

```python
def audit_security_groups() -> list:
    critical_ports = [22, 3306, 5432, 27017, 6379, 3389]
    exposed = []
    
    response = ec2.describe_security_groups()
    for sg in response["SecurityGroups"]:
        for rule in sg.get("IpPermissions", []):
            for ip_range in rule.get("IpRanges", []):
                if ip_range.get("CidrIp") == "0.0.0.0/0":
                    port = rule.get("FromPort", "all")
                    exposed.append({
                        "sg_id": sg["GroupId"],
                        "name": sg["GroupName"],
                        "port": port,
                        "risk": "HIGH" if port in critical_ports else "MEDIUM"
                    })
    return exposed
```

Port 22 open to the world is HIGH risk. Port 8080 open to the world is MEDIUM risk. Claude receives this classification and includes concrete remediation recommendations in the response — not just the finding.

### IAM key age detection

```python
def check_iam_key_age() -> list:
    result = []
    users = iam.list_users()["Users"]
    for user in users:
        keys = iam.list_access_keys(UserName=user["UserName"])["AccessKeyMetadata"]
        for key in keys:
            age_days = (datetime.now(key["CreateDate"].tzinfo) - key["CreateDate"]).days
            result.append({
                "user": user["UserName"],
                "key_id": key["AccessKeyId"],
                "status": key["Status"],
                "age_days": age_days,
                "risk": "HIGH" if age_days > 90 else "OK"
            })
    return result
```

An active key over 90 days without rotation is a standard security risk. This query answers "are there aged credentials that should be rotated?" in one natural language question.

### Result projection

AWS APIs return large JSON objects. `describe_instances` returns dozens of fields per instance. If the agent returns raw API output to Claude, context window is exhausted quickly.

Each function projects only the fields the user needs:

```python
def list_ec2_instances() -> list:
    response = ec2.describe_instances()
    instances = []
    for reservation in response["Reservations"]:
        for instance in reservation["Instances"]:
            instances.append({
                "id": instance["InstanceId"],
                "type": instance["InstanceType"],
                "state": instance["State"]["Name"],
                "public_ip": instance.get("PublicIpAddress", "none")
            })
    return instances
```

Four fields instead of forty. Claude receives enough context to answer the question without exhausting the conversation window on fields that are never used.

### Error handling

Every boto3 function is wrapped to return a structured error rather than raise an exception:

```python
def list_rds_instances() -> list:
    try:
        response = rds.describe_db_instances()
        # ... process
    except Exception as e:
        return [{"error": str(e)}]
```

If the function raises an unhandled exception, the agent breaks. If it returns `{"error": "message"}`, Claude interprets it: "The RDS query failed — verify that the credentials have `rds:DescribeDBInstances` permission." The error becomes part of the conversation rather than terminating it.

## Operational Considerations

**Destructive action confirmation** — the agent can stop EC2 instances. Confirmation is handled at the system prompt level rather than in code:

```
Before executing any action that modifies or stops a resource, state exactly what you are about to do and ask for explicit confirmation.
```

Claude applies this instruction consistently. Before executing `stop_instances`, it describes the exact instance and asks for confirmation. A code-level confirmation mechanism would be more robust for a production deployment.

**System prompt scope** — the system prompt is shorter than expected:

```
You are a DevOps operations agent with full access to the AWS infrastructure via the provided tools.
Use tools to retrieve real data before responding — do not rely on prior knowledge about the account state.
When identifying security issues, be specific and provide concrete remediation steps.
When reporting costs, sort by amount descending.
```

The instruction to use tools for real data is critical. Without it, Claude may answer questions from its training knowledge about AWS rather than querying the actual account.

**Stateless sessions** — the agent is stateless. Each session starts from scratch. Operational context built during one session — instance names, recent changes, current alerts — does not persist to the next. For a production operations tool, session persistence would reduce the setup cost of each conversation.

## Outcome

The agent reduces the operational overhead of routine AWS infrastructure queries. Questions that previously required multiple console views and CLI commands are answered in one natural language exchange. Security auditing, cost analysis and IAM hygiene checks that would otherwise require scheduled scripts run on demand.

The tool-use architecture means Claude's reasoning capability applies to the synthesized data — it can observe that EC2 spend increased this month, correlate it with a specific instance launched on a specific date, and surface that connection without being explicitly asked to perform that analysis.

The engineering investment is in tool quality, not agent complexity. The agent loop is 30 lines. The value is in the 31 precisely-described tools that give Claude accurate operational access.
