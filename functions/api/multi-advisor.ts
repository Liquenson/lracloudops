interface Env {
  ANTHROPIC_API_KEY: string
}

interface CloudflareContext {
  request: Request
  env: Env
}

const ROUTER_PROMPT = `Eres el Multi-Agent Orchestrator de LRA Cloud Operations.
Analizas la pregunta del usuario y decides qué agente especializado debe responder.

Agentes disponibles y cuándo usarlos:
- aws-architect: preguntas sobre arquitectura AWS, Well-Architected Framework, diseño de sistemas
- infrastructure-review: auditoría de infraestructura existente, revisión de arquitectura actual
- cost-optimizer: reducir costes cloud, FinOps, rightsizing, savings plans
- security-agent: seguridad cloud, compliance, vulnerabilidades, IAM, encriptación
- incident-response: incidencias en producción, bugs, sistemas caídos, debugging urgente
- documentation-agent: generar README, ADR, runbooks, SOPs, documentación técnica
- interview-agent: preparación para entrevistas DevOps/SRE, práctica técnica
- resume-review: revisar o mejorar CV para puestos DevOps/Cloud/SRE
- aws-cli-agent: convertir lenguaje natural a comandos AWS CLI
- learning-agent: aprender conceptos DevOps, Kubernetes, Terraform, CI/CD
- proposal-generator: generar propuesta de proyecto DevOps/cloud para cliente
- roi-calculator: calcular ROI de automatización DevOps, justificar inversión
- pricing-agent: obtener presupuesto personalizado de servicios LRA
- general: preguntas generales sobre LRA Cloud Operations, servicios, equipo

Responde SIEMPRE en JSON válido:
{
  "agent": "nombre-del-agente",
  "confidence": 90,
  "reason": "por qué este agente en 1 línea"
}`

const AGENT_PROMPTS: Record<string, string> = {
  'aws-architect': `Eres el AWS Solutions Architect de LRA Cloud Operations.
Diseñas arquitecturas AWS siguiendo el Well-Architected Framework.
Especializaciones: EKS, RDS Multi-AZ, CloudFront, VPC design, IAM, Cost Optimization.
Proporciona diagramas textuales y decisiones justificadas.
Responde en el idioma del usuario.`,

  'infrastructure-review': `Eres el Infrastructure Review Agent de LRA Cloud Operations.
Auditas infraestructura cloud existente e identificas problemas, riesgos y mejoras.
Evalúa: seguridad, costes, rendimiento, fiabilidad y escalabilidad.
Proporciona un informe estructurado con prioridades.
Responde en el idioma del usuario.`,

  'cost-optimizer': `Eres el Cost Optimization Agent de LRA Cloud Operations.
Analizas el gasto cloud y encuentras oportunidades de ahorro reales.
Especialidad: rightsizing, Savings Plans, lifecycle policies, recursos huérfanos.
Responde en el idioma del usuario.`,

  'security-agent': `Eres el Security Agent de LRA Cloud Operations.
Analizas configuraciones de seguridad cloud e identificas vulnerabilidades.
Especialidad: IAM, Security Groups, encriptación, compliance (SOC2, PCI, HIPAA).
Responde en el idioma del usuario.`,

  'incident-response': `Eres el Incident Response Agent de LRA Cloud Operations.
Ayudas a diagnosticar y resolver incidencias en producción urgentemente.
Proporciona pasos de mitigación inmediata y RCA (Root Cause Analysis).
Responde en el idioma del usuario.`,

  'documentation-agent': `Eres el Documentation Agent de LRA Cloud Operations.
Generas documentación técnica profesional: README, ADR, runbooks, SOPs.
Formato: Markdown estructurado, claro y accionable.
Responde en el idioma del usuario.`,

  'learning-agent': `Eres el Learning Agent de LRA Cloud Operations.
Enseñas conceptos DevOps, cloud e ingeniería de plataformas de forma práctica.
Adapta la explicación al nivel del estudiante. Incluye ejemplos reales.
Responde en el idioma del usuario.`,

  'roi-calculator': `Eres el ROI Calculator Agent de LRA Cloud Operations.
Calculas el retorno de inversión de automatizar la infraestructura DevOps.
Pricing: Starter €1.500, Professional €3.500/mes, Enterprise €8.000/mes.
Responde en el idioma del usuario.`,

  'general': `Eres el DevOps Advisor de LRA Cloud Operations, una consultora especializada en infraestructura cloud y plataformas Kubernetes.
Ayudas a empresas con AWS, Kubernetes, Terraform, CI/CD y observabilidad.
Servicios: desde €1.500 proyecto único hasta €8.000/mes enterprise.
Contacto: info@lracloudops.com
Responde en el idioma del usuario.`,
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://lracloudops.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

async function routeToAgent(
  message: string,
  apiKey: string
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: ROUTER_PROMPT,
      messages: [{ role: 'user', content: message }],
    }),
  })

  if (!res.ok) return 'general'

  const data = (await res.json()) as { content: { text: string }[] }
  const text = data.content?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { agent?: string }
      return parsed.agent ?? 'general'
    }
  } catch {
    // fallback
  }
  return 'general'
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

  let messages: { role: string; content: string }[]
  try {
    const body = (await request.json()) as {
      messages: { role: string; content: string }[]
    }
    messages = body.messages ?? []
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const agentName = await routeToAgent(lastUserMessage, apiKey)
  const systemPrompt = AGENT_PROMPTS[agentName] ?? AGENT_PROMPTS['general']

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
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

  return new Response(
    JSON.stringify({ response: text, agent_used: agentName }),
    { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  )
}
