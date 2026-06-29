interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const ROI_PROMPT = `Eres el ROI Calculator Agent de LRA Cloud Operations.
Calculas el retorno de inversión de automatizar la infraestructura DevOps con datos reales del cliente.

Pricing base de LRA Cloud Operations:
- Starter: desde €1.500/proyecto único (ideal para equipos pequeños)
- Professional: desde €3.500/mes retainer (equipos medianos, múltiples servicios)
- Enterprise: desde €8.000/mes custom (empresas grandes, plataforma completa)

Cálculos base:
- Automatización DevOps reduce tiempo de deploy en 85% de media
- Reduce incidencias en producción en 60% de media
- Cada hora de ingeniero senior cuesta €50-120/h según mercado

Responde SIEMPRE en JSON válido:
{
  "current_costs": {
    "deploy_cost_monthly": 2400,
    "incident_cost_monthly": 800,
    "total_monthly": 3200
  },
  "with_lra": {
    "reduction_pct": 82,
    "new_monthly_cost": 480,
    "lra_fee": "desde €1.500 (Starter)"
  },
  "roi": {
    "monthly_savings": 2720,
    "annual_savings": 32640,
    "payback_months": 1,
    "roi_pct": 2176
  },
  "quick_wins": [
    "Automatizar pipeline CI/CD — impacto inmediato en tiempo de deploy",
    "Alertas proactivas — reduce MTTR de incidencias en 60%"
  ],
  "recommended_plan": "Starter|Professional|Enterprise",
  "summary": "resumen ejecutivo de 2 líneas con los números clave"
}

Basa los cálculos en los datos reales que te proporcionen. Sé conservador pero realista.
Responde en el idioma del usuario.`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://lracloudops.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export const onRequestPost = async (
  context: CloudflareContext
): Promise<Response> => {
  const { request, env } = context

  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  let team_size: string
  let manual_deploys_per_week: number
  let hours_per_deploy: number
  let hourly_rate: number
  let incidents_per_month: number
  let cloud_spend: number
  let lang: string
  try {
    const body = (await request.json()) as {
      team_size?: string
      manual_deploys_per_week?: number
      hours_per_deploy?: number
      hourly_rate?: number
      incidents_per_month?: number
      cloud_spend?: number
      lang?: string
    }
    team_size = body.team_size ?? '1-5'
    manual_deploys_per_week = body.manual_deploys_per_week ?? 5
    hours_per_deploy = body.hours_per_deploy ?? 2
    hourly_rate = body.hourly_rate ?? 60
    incidents_per_month = body.incidents_per_month ?? 2
    cloud_spend = body.cloud_spend ?? 500
    lang = body.lang ?? 'en'
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  const userPrompt = `Calcula el ROI para este cliente. Idioma de respuesta: ${lang === 'es' ? 'Español' : 'English'}.

Datos del equipo:
- Tamaño del equipo: ${team_size} personas
- Deploys manuales por semana: ${manual_deploys_per_week}
- Horas por deploy: ${hours_per_deploy}h
- Coste por hora del equipo: €${hourly_rate}/h
- Incidencias por mes: ${incidents_per_month}
- Gasto cloud mensual: €${cloud_spend}

Calcula el coste actual, el ahorro con LRA y el ROI. Recomienda el plan más adecuado.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: ROI_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
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
    analysis = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
      : { summary: text }
  } catch {
    analysis = { summary: text }
  }

  return new Response(JSON.stringify({ analysis }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
