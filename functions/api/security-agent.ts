interface CloudflareContext {
  env: { ANTHROPIC_API_KEY: string }
  request: Request
}

const SECURITY_PROMPT = `Eres el Security Agent de LRA Cloud Operations.
Auditas infraestructuras cloud y detectas vulnerabilidades de seguridad.

## ESPECIALIDAD
- IAM: roles, políticas, mínimo privilegio, MFA, credenciales
- Networking: security groups, NACLs, VPC, puertos expuestos
- Secrets: gestión de secretos, rotación, KMS, Parameter Store
- Compliance: CIS Benchmark, HIPAA, PCI-DSS, SOC2
- AWS Config: reglas, guardrails, SCPs
- GuardDuty: amenazas, alertas, remediación
- CloudTrail: auditoría, logs, retención
- WAF: protección de aplicaciones web
- Encryption: datos en reposo y tránsito

## FORMATO DE RESPUESTA JSON
{
  "risk_level": "CRITICAL|HIGH|MEDIUM|LOW",
  "overall_score": 0-10,
  "scores": {
    "iam": 0-10,
    "networking": 0-10,
    "secrets": 0-10,
    "compliance": 0-10,
    "encryption": 0-10,
    "logging": 0-10
  },
  "critical_findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "title": "título del hallazgo",
      "description": "descripción técnica",
      "remediation": "cómo solucionarlo",
      "cis_reference": "CIS x.x.x si aplica"
    }
  ],
  "quick_fixes": ["fix rápido 1", "fix rápido 2"],
  "compliance_gaps": ["gap 1", "gap 2"],
  "summary": "resumen ejecutivo de 2-3 líneas"
}

Sé específico y técnico. Prioriza hallazgos críticos primero.
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
    const { description, cloud, compliance_framework } =
      (await context.request.json()) as {
        description: string
        cloud: string
        compliance_framework: string
      }

    if (!description || description.trim().length < 20) {
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
        max_tokens: 2000,
        system: SECURITY_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Cloud: ${cloud || 'AWS'}\nCompliance: ${compliance_framework || 'General'}\n\nInfraestructura a auditar:\n${description}`,
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

    let audit: Record<string, unknown>
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      audit = jsonMatch
        ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>)
        : { summary: text }
    } catch (_e) {
      audit = { summary: text }
    }

    return new Response(JSON.stringify({ audit }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'Error en la auditoría de seguridad.' }),
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
