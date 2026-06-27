interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const REVIEW_PROMPT = `Eres el Infrastructure Review Agent de LRA Cloud Operations.
Analiza la infraestructura que te describe el usuario y genera un informe técnico.

## TU ESPECIALIDAD
- Auditoría de arquitecturas AWS, Azure y GCP
- Revisión de Terraform e IaC
- Análisis de seguridad IAM, networking, secrets
- Optimización de costes cloud
- Alta disponibilidad y disaster recovery
- Detección de anti-patterns y deuda técnica

## FORMATO DE RESPUESTA
Responde SIEMPRE con este JSON estructurado:
{
  "scores": {
    "security": 0-10,
    "cost": 0-10,
    "availability": 0-10,
    "automation": 0-10,
    "scalability": 0-10
  },
  "overall": 0-10,
  "critical_issues": ["lista de problemas críticos"],
  "recommendations": ["lista de recomendaciones priorizadas"],
  "quick_wins": ["mejoras rápidas de alto impacto"],
  "summary": "resumen ejecutivo en 2-3 líneas"
}

## REGLAS
- Sé específico y técnico — no genérico
- Prioriza seguridad y disponibilidad
- Menciona servicios AWS/Azure/GCP específicos cuando sea relevante
- Si la descripción es vaga, pide más detalles antes de puntuar
- Responde en el idioma del usuario`

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

  let architecture: string
  try {
    const body = (await request.json()) as {
      architecture: string
      lang: string
    }
    architecture = body.architecture ?? ''
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  if (!architecture || architecture.trim().length < 20) {
    return new Response(
      JSON.stringify({
        error:
          'Descripción demasiado corta. Proporciona más detalles sobre tu infraestructura.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    )
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
      system: REVIEW_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analiza esta infraestructura y genera el informe:\n\n${architecture}`,
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
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    )
  }

  const data = (await response.json()) as { content: { text: string }[] }
  const text = data.content?.[0]?.text ?? ''

  let review: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    review = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
      : { summary: text }
  } catch {
    review = { summary: text }
  }

  return new Response(JSON.stringify({ review }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
