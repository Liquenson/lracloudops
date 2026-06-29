interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const PRICING_PROMPT = `Eres el Pricing Intelligence Agent de LRA Cloud Operations.
Generas presupuestos personalizados basados en los requisitos del cliente.

Pricing base de LRA Cloud Operations:
- Starter: desde €1.500 (proyecto único, alcance limitado, ideal startups o equipos pequeños)
  Incluye: diagnóstico + implementación puntual + documentación básica
- Professional: desde €3.500/mes retainer (equipo mediano, múltiples servicios, soporte continuo)
  Incluye: plataforma completa + CI/CD + monitoring + soporte mensual
- Enterprise: desde €8.000/mes custom (empresa grande, plataforma a medida, SLA garantizado)
  Incluye: todo Professional + arquitectura custom + on-call 24/7 + compliance

Factores que aumentan el precio:
- Multi-cloud: +20%
- Compliance regulatorio (HIPAA, SOC2, PCI): +30%
- Migración de legacy: +25%
- Plazo muy corto (< 2 semanas): +15%

Factores que reducen el precio:
- Stack simple y bien documentado: -10%
- Cliente startup en fase early: -15% (precio Startup Friendly)
- Proyecto de referencia (permitimos caso de estudio): -10%

Responde SIEMPRE en JSON válido:
{
  "recommended_plan": "Starter|Professional|Enterprise",
  "price_range": "desde €1.500 hasta €2.500",
  "timeline": "3-4 semanas",
  "deliverables": [
    "Infraestructura AWS completa como código (Terraform)",
    "Pipeline CI/CD con GitHub Actions",
    "Monitoring básico con alertas"
  ],
  "why_this_plan": "justificación de 2-3 líneas del plan recomendado",
  "alternatives": [
    {
      "plan": "Professional",
      "price": "desde €3.500/mes",
      "difference": "Incluye soporte continuo y múltiples servicios"
    }
  ],
  "next_steps": "descripción de próximos pasos concretos",
  "summary": "resumen ejecutivo de 1-2 líneas"
}

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

  let requirements: string
  let team_size: string
  let timeline: string
  let cloud_provider: string
  let current_stack: string
  let lang: string
  try {
    const body = (await request.json()) as {
      requirements?: string
      team_size?: string
      timeline?: string
      cloud_provider?: string
      current_stack?: string
      lang?: string
    }
    requirements = body.requirements ?? ''
    team_size = body.team_size ?? 'unknown'
    timeline = body.timeline ?? 'flexible'
    cloud_provider = body.cloud_provider ?? 'AWS'
    current_stack = body.current_stack ?? 'not specified'
    lang = body.lang ?? 'en'
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  if (!requirements.trim()) {
    return new Response(
      JSON.stringify({ error: 'Requirements are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }

  const userPrompt = `Genera un presupuesto personalizado. Idioma de respuesta: ${lang === 'es' ? 'Español' : 'English'}.

Requisitos del cliente:
- Tipo de proyecto / necesidad: ${requirements}
- Tamaño de empresa: ${team_size}
- Timeline deseado: ${timeline}
- Cloud provider: ${cloud_provider}
- Stack actual: ${current_stack}

Recomienda el plan más adecuado con precio, deliverables y próximos pasos.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: PRICING_PROMPT,
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

  let quote: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    quote = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
      : { summary: text }
  } catch {
    quote = { summary: text }
  }

  return new Response(JSON.stringify({ quote }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
