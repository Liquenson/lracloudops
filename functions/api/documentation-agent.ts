interface CloudflareContext {
  env: { ANTHROPIC_API_KEY: string }
  request: Request
}

const DOC_PROMPT = `Eres el Documentation Agent de LRA Cloud Operations.
Generas documentación técnica profesional de alta calidad.

## TIPOS DE DOCUMENTACIÓN
- README.md: descripción, instalación, uso, contributing, badges
- ADR (Architecture Decision Record): contexto, decisión, consecuencias
- Runbook: procedimientos operativos paso a paso
- SOP (Standard Operating Procedure): procesos estandarizados
- Postmortem: análisis de incidencias con timeline y acciones
- API Documentation: endpoints, parámetros, ejemplos curl

## REGLAS
- Usa Markdown profesional con secciones claras
- Incluye ejemplos de código con syntax highlighting
- Sé específico y técnico
- Incluye badges en READMEs (build, coverage, license)
- Responde en el idioma del usuario

Devuelve el documento completo en Markdown listo para usar.`

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lracloudops.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestPost(
  context: CloudflareContext
): Promise<Response> {
  try {
    const { doc_type, project_description, tech_stack } =
      (await context.request.json()) as {
        doc_type: string
        project_description: string
        tech_stack: string
      }

    if (!project_description || project_description.trim().length < 20) {
      return new Response(
        JSON.stringify({
          error: 'Descripción demasiado corta (mínimo 20 caracteres).',
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
        max_tokens: 3000,
        system: DOC_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Tipo: ${doc_type || 'README'}\nStack: ${tech_stack || 'No especificado'}\n\nDescripción:\n${project_description}`,
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
    const document = data.content[0]?.text ?? ''

    return new Response(JSON.stringify({ document }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'Error generando documentación.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders })
}
