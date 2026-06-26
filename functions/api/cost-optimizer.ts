interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const COST_PROMPT = `Eres el Cost Optimization Agent de LRA Cloud Operations.
Analizas el gasto cloud del cliente y encuentras oportunidades de ahorro reales.

## TU ESPECIALIDAD
- AWS Cost Explorer análisis
- Rightsizing de instancias EC2 y RDS
- Savings Plans vs Reserved Instances
- Optimización de S3 (lifecycle policies, storage classes)
- Eliminación de recursos no utilizados
- Optimización de transferencia de datos
- Kubernetes resource requests/limits

## FORMATO DE RESPUESTA JSON
{
  "current_monthly_estimate": "X€/mes (estimado)",
  "potential_savings_pct": 0-80,
  "potential_savings_monthly": "X€/mes estimado",
  "quick_wins": [
    {
      "action": "descripción de la acción",
      "savings": "X€/mes estimado",
      "effort": "Bajo|Medio|Alto",
      "priority": 1-10
    }
  ],
  "medium_term": ["optimización a medio plazo"],
  "tools_recommended": ["herramienta 1", "herramienta 2"],
  "summary": "resumen de 2 líneas"
}

Sé conservador con las estimaciones de ahorro.
Menciona siempre que son estimaciones sin acceso a datos reales.
Responde en el idioma del usuario.`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://lracloudops.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export const onRequestPost = async (context: CloudflareContext): Promise<Response> => {
  const { request, env } = context

  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  let description: string
  let monthly_spend: string
  try {
    const body = (await request.json()) as { description: string; monthly_spend: string }
    description = body.description ?? ''
    monthly_spend = body.monthly_spend ?? 'desconocido'
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
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
      system: COST_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Gasto mensual actual: ${monthly_spend}\n\nDescripción de la infraestructura:\n${description}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(
      JSON.stringify({ error: `Anthropic error: ${response.status}`, detail: err }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }

  const data = (await response.json()) as { content: { text: string }[] }
  const text = data.content?.[0]?.text ?? ''

  let analysis: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    analysis = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : { summary: text }
  } catch {
    analysis = { summary: text }
  }

  return new Response(JSON.stringify({ analysis }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
