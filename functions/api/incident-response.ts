interface CloudflareContext {
  env: { ANTHROPIC_API_KEY: string }
  request: Request
}

const INCIDENT_PROMPT = `Eres el Incident Response Agent de LRA Cloud Operations.
Diagnosticas incidencias en infraestructuras cloud y Kubernetes rápidamente.

## ESPECIALIDAD
- CloudWatch: alarmas, métricas, logs, insights
- Prometheus/Grafana: queries, dashboards, alertas
- Kubernetes: pod crashes, OOMKilled, pending pods, node issues
- RDS: conexiones, performance, locks, replication lag
- EC2: CPU, memory, disk, network issues
- EKS: node groups, autoscaler, ingress
- Root Cause Analysis sistemático
- Timeline de incidencias
- Plan de remediación paso a paso

## FORMATO DE RESPUESTA JSON
{
  "severity": "P1|P2|P3|P4",
  "probable_cause": "causa más probable",
  "confidence": 0-100,
  "timeline": [
    {"time": "T+0", "event": "descripción del evento"}
  ],
  "investigation_steps": [
    {
      "step": 1,
      "action": "qué hacer",
      "command": "comando exacto si aplica",
      "expected": "qué esperar ver"
    }
  ],
  "immediate_remediation": ["acción inmediata 1", "acción inmediata 2"],
  "root_cause_analysis": "análisis detallado de la causa raíz",
  "prevention": ["medida preventiva 1", "medida preventiva 2"],
  "summary": "resumen ejecutivo de 2 líneas"
}

Prioriza la restauración del servicio. Sé específico con comandos.
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
    const { symptoms, infrastructure, logs } =
      (await context.request.json()) as {
        symptoms: string
        infrastructure: string
        logs: string
      }

    if (!symptoms || symptoms.trim().length < 10) {
      return new Response(
        JSON.stringify({
          error: 'Describe los síntomas (mínimo 10 caracteres).',
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
        system: INCIDENT_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Síntomas: ${symptoms}\nInfraestructura: ${infrastructure || 'No especificada'}\nLogs/Errores:\n${logs || 'No proporcionados'}`,
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

    let incident: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      incident = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
        : { summary: text }
    } catch (_e) {
      incident = { summary: text }
    }

    return new Response(JSON.stringify({ incident }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'Error analizando la incidencia.' }),
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
