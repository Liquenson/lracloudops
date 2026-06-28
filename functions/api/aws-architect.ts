interface CloudflareContext {
  env: { ANTHROPIC_API_KEY: string }
  request: Request
}

const AWS_ARCHITECT_PROMPT = `Eres el AWS Architect Agent de LRA Cloud Operations.
Diseñas arquitecturas AWS de nivel enterprise con las mejores prácticas del AWS Well-Architected Framework.

## ESPECIALIDAD
- AWS Well-Architected Framework (5 pilares)
- Serverless: Lambda, API Gateway, Step Functions, EventBridge
- Containers: ECS Fargate, EKS, ECR
- Data: RDS Multi-AZ, Aurora Serverless, DynamoDB, S3, ElastiCache
- Networking: VPC, ALB/NLB, CloudFront, Route53, Direct Connect
- Security: IAM, Secrets Manager, KMS, WAF, Shield
- Observability: CloudWatch, X-Ray, OpenTelemetry
- Cost: Savings Plans, Reserved Instances, Spot, Cost Explorer

## FORMATO DE RESPUESTA JSON
{
  "architecture_name": "nombre de la arquitectura",
  "pattern": "Serverless|Microservices|Monolith-to-Micro|Data Platform|Event-Driven|etc",
  "well_architected": {
    "operational_excellence": "evaluación del pilar",
    "security": "evaluación del pilar",
    "reliability": "evaluación del pilar",
    "performance": "evaluación del pilar",
    "cost_optimization": "evaluación del pilar"
  },
  "components": [
    {
      "service": "nombre del servicio AWS",
      "purpose": "qué hace en la arquitectura",
      "sizing": "tipo/tamaño recomendado"
    }
  ],
  "estimated_monthly_cost": "$X - $Y USD",
  "diagram_description": "descripción del flujo de arquitectura",
  "trade_offs": ["trade-off 1", "trade-off 2"],
  "migration_path": ["paso 1", "paso 2", "paso 3"],
  "summary": "resumen de 2-3 líneas"
}

Sé técnico y específico. Incluye tipos de instancia, configuraciones concretas.
Responde en el idioma del usuario.`

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lracloudops.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestPost(
  context: CloudflareContext
): Promise<Response> {
  try {
    const { description, workload_type, scale, budget_priority } =
      (await context.request.json()) as {
        description: string
        workload_type: string
        scale: string
        budget_priority: string
      }

    if (!description || description.trim().length < 20) {
      return new Response(
        JSON.stringify({
          error: 'Descripción demasiado corta (mínimo 20 caracteres).',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const apiKey = context.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        system: AWS_ARCHITECT_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Tipo de workload: ${workload_type || 'General'}\nEscala: ${scale || 'Startup'}\nPrioridad de presupuesto: ${budget_priority || 'Balanced'}\n\nDescripción del sistema:\n${description}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(
        JSON.stringify({
          error: `Anthropic error: ${response.status}`,
          detail: err,
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const data = (await response.json()) as { content: Array<{ text: string }> }
    const text = data.content[0]?.text ?? ''

    let architecture: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      architecture = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
        : { summary: text }
    } catch (_e) {
      architecture = { summary: text }
    }

    return new Response(JSON.stringify({ architecture }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'Error generando la arquitectura.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders })
}
