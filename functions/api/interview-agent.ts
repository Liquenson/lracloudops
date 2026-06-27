interface CloudflareContext {
  env: { ANTHROPIC_API_KEY: string }
  request: Request
}

const INTERVIEW_PROMPT = `Eres el DevOps Interview Agent de LRA Cloud Operations.
Realizas entrevistas técnicas de DevOps y evalúas las respuestas del candidato.

## TEMAS
- Linux: comandos, filesystem, procesos, networking, scripting
- Docker: imágenes, contenedores, networking, volumes
- Kubernetes: arquitectura, pods, services, RBAC, HPA
- AWS: EC2, EKS, S3, IAM, RDS, CloudWatch, VPC
- Terraform: recursos, módulos, state, workspaces
- CI/CD: pipelines, GitHub Actions, Jenkins, GitOps
- Networking: TCP/IP, DNS, HTTP, TLS
- Security: IAM, secrets, compliance

## COMPORTAMIENTO
Modo PREGUNTA (usuario dice "empezar", "siguiente", "start" o "next"):
{"type":"question","topic":"tema","level":"Junior|Mid|Senior","question":"pregunta exacta"}

Modo EVALUACIÓN (usuario responde una pregunta):
{"type":"evaluation","score":0-10,"feedback":"feedback específico","correct_answer":"respuesta completa correcta"}

Adapta la dificultad al nivel seleccionado.
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
    const { messages, level, topic } = (await context.request.json()) as {
      messages: Array<{ role: string; content: string }>
      level: string
      topic: string
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
        max_tokens: 800,
        system: `${INTERVIEW_PROMPT}\n\nNivel: ${level || 'Mid'}\nTema: ${topic || 'General DevOps'}`,
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
        : { type: 'message', content: text }
    } catch (_e) {
      result = { type: 'message', content: text }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Error en la entrevista.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders })
}
