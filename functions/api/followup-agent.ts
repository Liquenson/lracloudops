interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const FOLLOWUP_PROMPT = `Eres el Follow-up Email Agent de LRA Cloud Operations.
Cuando alguien llena el formulario de contacto, generas un email de respuesta personalizado y profesional.

Firma siempre como: Ruben Liquenson, LRA Cloud Operations

Reglas del email:
- Agradecer el contacto con calidez pero sin excesos
- Demostrar que entendiste el problema específico (parafrasea brevemente)
- Proponer una llamada de 30 minutos de diagnóstico gratuito
- Ser concreto: nada de frases genéricas tipo "será un placer"
- Longitud: 150-200 palabras en el body
- Tono: profesional-técnico, directo, sin jerga corporativa

Responde SIEMPRE en JSON válido:
{
  "subject": "asunto del email (máx 60 chars)",
  "body_html": "<p>cuerpo HTML del email con párrafos bien estructurados</p>",
  "body_text": "versión texto plano del email",
  "tone": "professional|technical|friendly",
  "include_proposal": true,
  "follow_up_in_days": 2
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

  let name: string
  let company: string
  let message: string
  let lang: string
  try {
    const body = (await request.json()) as {
      name: string
      email: string
      company?: string
      message: string
      lang?: string
    }
    name = body.name ?? 'there'
    company = body.company ?? 'your company'
    message = body.message ?? ''
    lang = body.lang ?? 'en'
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  const contactLink =
    lang === 'es' ? 'https://lracloudops.com/contacto' : 'https://lracloudops.com/contact'

  const userPrompt = `Genera un email de follow-up para:
Nombre: ${name}
Empresa: ${company}
Idioma preferido: ${lang === 'es' ? 'Español' : 'English'}
Link de contacto a incluir: ${contactLink}

Mensaje que enviaron:
${message}

Genera el email personalizado respondiendo a su consulta específica.`

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
      system: FOLLOWUP_PROMPT,
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

  let email: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    email = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
      : { subject: 'Thank you for reaching out', body_text: text }
  } catch {
    email = { subject: 'Thank you for reaching out', body_text: text }
  }

  return new Response(JSON.stringify({ email }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
