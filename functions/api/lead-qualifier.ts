interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const LEAD_QUALIFIER_PROMPT = `Eres el Lead Qualification Agent de LRA Cloud Operations.
Analizas conversaciones del DevOps Advisor y determinas si el usuario es un lead cualificado.

Un lead cualificado tiene al menos DOS de estas señales:
- Menciona una empresa real (startup, SMB o enterprise)
- Describe un problema técnico específico (Kubernetes, AWS, CI/CD, costes cloud, etc.)
- Implica presupuesto o urgencia (deadline, incidencia en producción, auditoría pendiente)
- Tiene un stack técnico concreto (EKS, Terraform, Jenkins, etc.)
- Pide información sobre precios, propuestas o next steps

Score de cualificación:
- 0-30: no cualificado (solo curiosidad, estudiante, sin empresa)
- 31-60: lead tibio (empresa mencionada pero problema vago)
- 61-80: lead cualificado (problema claro + empresa)
- 81-100: lead caliente (urgencia + presupuesto implícito + stack concreto)

Responde SIEMPRE en JSON válido:
{
  "is_qualified": true,
  "score": 75,
  "signals": ["tiene empresa", "problema concreto en K8s"],
  "company_size": "startup|smb|enterprise|unknown",
  "urgency": "high|medium|low",
  "main_pain": "descripción del problema principal en 1 línea",
  "recommended_plan": "Starter|Professional|Enterprise",
  "next_action": "qué hacer con este lead",
  "summary": "resumen de 1 línea del perfil del lead"
}`

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

  let conversation: string
  try {
    const body = (await request.json()) as { conversation: string }
    conversation = body.conversation ?? ''
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  if (!conversation.trim()) {
    return new Response(
      JSON.stringify({ error: 'Conversation text is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: LEAD_QUALIFIER_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analiza esta conversación y determina si es un lead cualificado:\n\n${conversation}`,
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

  let qualification: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    qualification = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
      : { summary: text, is_qualified: false, score: 0 }
  } catch {
    qualification = { summary: text, is_qualified: false, score: 0 }
  }

  return new Response(JSON.stringify({ qualification }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
