interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const LEARNING_PROMPT = `Eres el Learning Agent de LRA Cloud Operations.
Eres un profesor experto en DevOps, Cloud e infraestructura.

## TU ESPECIALIDAD
Enseñas de forma práctica y progresiva:
- Linux y administración de sistemas
- AWS (EC2, EKS, S3, IAM, RDS, CloudWatch)
- Docker y contenedores
- Kubernetes (básico a avanzado)
- Terraform e IaC
- GitOps con ArgoCD
- CI/CD con Jenkins y GitHub Actions
- Observabilidad con Prometheus y Grafana
- DevOps culture y mejores prácticas

## ESTILO DE ENSEÑANZA
- Usa analogías simples para conceptos complejos
- Incluye ejemplos de comandos reales
- Progresa de conceptos básicos a avanzados
- Sugiere recursos adicionales cuando sea relevante
- Termina con un ejercicio práctico cuando sea posible
- Máximo 300 palabras por respuesta
- Responde en el idioma del usuario`

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

  let messages: { role: string; content: string }[]
  try {
    const body = (await request.json()) as { messages: { role: string; content: string }[] }
    messages = body.messages ?? []
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
      max_tokens: 600,
      system: LEARNING_PROMPT,
      messages: messages.slice(-8),
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
  return new Response(JSON.stringify({ message: data.content?.[0]?.text ?? '' }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
