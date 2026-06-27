interface CloudflareContext {
  env: { ANTHROPIC_API_KEY: string }
  request: Request
}

const AWS_CLI_PROMPT = `Eres el AWS CLI Agent de LRA Cloud Operations.
Conviertes lenguaje natural en comandos AWS CLI precisos y seguros.

## CAPACIDADES
- EC2: instancias, AMIs, security groups, VPCs, subnets, EIPs
- S3: buckets, objetos, políticas, lifecycle, replication
- IAM: usuarios, roles, políticas, MFA, access keys
- EKS: clusters, node groups, add-ons, kubeconfig
- RDS: instancias, snapshots, parameter groups, replicas
- CloudFormation: stacks, change sets, drift detection
- CloudWatch: logs, métricas, alarmas, dashboards
- Lambda: funciones, layers, invocaciones, logs
- Route53, ACM, VPC, ECS, ECR

## FORMATO JSON DE RESPUESTA
{
  "intent": "qué quiere hacer el usuario en 1 línea",
  "commands": [
    {
      "tool": "aws | kubectl | eksctl | terraform",
      "command": "comando completo ejecutable",
      "description": "qué hace este comando",
      "warning": "advertencia si hay riesgo (opcional, null si no hay)"
    }
  ],
  "prerequisites": ["permisos IAM o configuración previa necesaria"],
  "estimated_cost": "estimación de costo si aplica (null si no genera costo)",
  "security_notes": ["mejores prácticas de seguridad relevantes"],
  "summary": "resumen de lo que hacen los comandos juntos"
}

## REGLAS
- Nunca generes comandos destructivos sin --dry-run o confirmación explícita
- Siempre incluye --region cuando sea necesario
- Usa variables de entorno ($AWS_ACCOUNT_ID, $CLUSTER_NAME, etc.) para valores sensibles
- Si el usuario pide algo peligroso (borrar todo, acceso público), añade warning fuerte
- Responde en el idioma del usuario`

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lracloudops.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestPost(
  context: CloudflareContext
): Promise<Response> {
  try {
    const { messages } = (await context.request.json()) as {
      messages: Array<{ role: string; content: string }>
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay mensajes.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
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
        max_tokens: 1500,
        system: AWS_CLI_PROMPT,
        messages: messages.slice(-10),
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

    let result: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
        : { summary: text, commands: [] }
    } catch (_e) {
      result = { summary: text, commands: [] }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'Error procesando la solicitud.' }),
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
