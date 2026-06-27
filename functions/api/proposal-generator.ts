interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const PROPOSAL_PROMPT = `Eres el Proposal Generator Agent de LRA Cloud Operations.
Generas propuestas técnicas profesionales basadas en los requisitos del cliente.

## LRA CLOUD OPERATIONS
- Consultora DevOps especializada en AWS, Azure y GCP
- Planes: Starter desde 1.500€, Professional desde 3.500€/mes, Enterprise a medida
- Stack: Terraform, Kubernetes, GitOps, ArgoCD, Prometheus, Grafana
- Equipo: Ruben Liquenson (AWS), Kelvin Osaigbovo (Azure), Darwin Pochet (Network)

## FORMATO DE RESPUESTA JSON
{
  "plan_recommended": "Starter|Professional|Enterprise",
  "price_range": "desde X€",
  "timeline": "X semanas",
  "scope": ["entregable 1", "entregable 2"],
  "architecture": "descripción de la arquitectura propuesta",
  "tech_stack": ["tecnología 1", "tecnología 2"],
  "phases": [
    {"name": "Fase 1", "duration": "X semanas", "deliverables": ["..."]}
  ],
  "risks": ["riesgo 1", "riesgo 2"],
  "next_steps": "próximos pasos para arrancar",
  "summary": "resumen ejecutivo de 3 líneas"
}

Sé específico, técnico y ajusta el precio al alcance real.
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
  try {
    const body = (await request.json()) as { requirements: string }
    requirements = body.requirements ?? ''
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
      max_tokens: 2000,
      system: PROPOSAL_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Genera una propuesta para este proyecto:\n\n${requirements}`,
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

  let proposal: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    proposal = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
      : { summary: text }
  } catch {
    proposal = { summary: text }
  }

  return new Response(JSON.stringify({ proposal }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
