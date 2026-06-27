interface CloudflareContext {
  env: { ANTHROPIC_API_KEY: string }
  request: Request
}

const RESUME_PROMPT = `Eres el Resume Review Agent de LRA Cloud Operations.
Revisas CVs de ingenieros DevOps y Cloud y los optimizas para ATS.

## ESPECIALIDAD
- Optimización ATS (Applicant Tracking Systems)
- Keywords DevOps: Kubernetes, Terraform, AWS, Docker, CI/CD, GitOps
- Formato y estructura de CV técnico
- Cuantificación de logros
- LinkedIn optimization

## FORMATO JSON
{
  "ats_score": 0-100,
  "overall_rating": 0-10,
  "strengths": ["fortaleza 1"],
  "critical_issues": ["problema crítico 1"],
  "missing_keywords": ["keyword 1"],
  "improvements": [
    {
      "section": "sección",
      "issue": "problema",
      "suggestion": "mejora concreta",
      "example": "ejemplo de texto mejorado"
    }
  ],
  "linkedin_tips": ["consejo 1"],
  "role_fit": {
    "DevOps Engineer": 0-100,
    "Platform Engineer": 0-100,
    "Cloud Engineer": 0-100,
    "SRE": 0-100
  },
  "summary": "resumen de 2 líneas"
}

Sé honesto y da ejemplos concretos. Responde en el idioma del usuario.`

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lracloudops.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestPost(
  context: CloudflareContext
): Promise<Response> {
  try {
    const { resume_text, target_role } = (await context.request.json()) as {
      resume_text: string
      target_role: string
    }

    if (!resume_text || resume_text.trim().length < 50) {
      return new Response(
        JSON.stringify({
          error: 'Por favor pega tu CV completo (mínimo 50 caracteres).',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
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
        max_tokens: 2000,
        system: RESUME_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Rol objetivo: ${target_role || 'DevOps Engineer'}\n\nCV:\n${resume_text}`,
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
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const data = (await response.json()) as { content: Array<{ text: string }> }
    const text = data.content[0]?.text ?? ''

    let review: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      review = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
        : { summary: text }
    } catch (_e) {
      review = { summary: text }
    }

    return new Response(JSON.stringify({ review }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Error revisando el CV.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders })
}
