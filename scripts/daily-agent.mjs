#!/usr/bin/env node
/**
 * LRA Cloud Ops — Daily Maintenance Agent
 * Generates one EN + one ES blog post per day using Claude via fetch.
 * Runs in GitHub Actions at 09:00 UTC via daily-agent.yml.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const LOG_PATH = path.join(__dirname, 'agent-log.json')

// ── Secret validation — fail loud so GitHub Actions marks the run red ────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim()
if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'undefined') {
  console.error('❌ ANTHROPIC_API_KEY is not set or empty')
  console.error('Set it in GitHub Settings → Secrets → Actions → ANTHROPIC_API_KEY')
  process.exit(1)
}
console.log('✅ ANTHROPIC_API_KEY present:', ANTHROPIC_API_KEY.slice(0, 12) + '...')

// ── Topic rotation (deterministic by day-of-year) ──────────────────────────
const TOPICS = [
  { en: 'Kubernetes Resource Management and HPA', es: 'Gestión de recursos en Kubernetes y HPA', tags: ['Kubernetes', 'DevOps', 'Cloud'] },
  { en: 'Terraform State Management Best Practices', es: 'Mejores prácticas para gestionar el estado en Terraform', tags: ['Terraform', 'IaC', 'DevOps'] },
  { en: 'AWS EKS Cluster Hardening', es: 'Hardening de clústeres AWS EKS', tags: ['AWS', 'Kubernetes', 'Security'] },
  { en: 'GitOps Patterns with ArgoCD', es: 'Patrones GitOps con ArgoCD', tags: ['GitOps', 'ArgoCD', 'Kubernetes'] },
  { en: 'Docker Multi-Stage Build Optimization', es: 'Optimización de builds multi-stage en Docker', tags: ['Docker', 'DevOps', 'CI/CD'] },
  { en: 'Observability with Prometheus and Grafana', es: 'Observabilidad con Prometheus y Grafana', tags: ['Observability', 'SRE', 'DevOps'] },
  { en: 'GitHub Actions Advanced Workflows', es: 'Workflows avanzados con GitHub Actions', tags: ['CI/CD', 'GitHub Actions', 'DevOps'] },
  { en: 'AWS IAM Least Privilege Patterns', es: 'Patrones de mínimo privilegio en AWS IAM', tags: ['AWS', 'Security', 'IAM'] },
  { en: 'Platform Engineering Internal Developer Platforms', es: 'Ingeniería de plataforma: plataformas internas de desarrollo', tags: ['Platform Engineering', 'DevOps', 'Cloud'] },
  { en: 'Incident Response Runbook Automation', es: 'Automatización de runbooks para respuesta a incidencias', tags: ['SRE', 'DevOps', 'Automation'] },
  { en: 'Kubernetes Networking with Cilium', es: 'Networking en Kubernetes con Cilium', tags: ['Kubernetes', 'Networking', 'Cloud'] },
  { en: 'AWS Cost Optimization Strategies', es: 'Estrategias de optimización de costes en AWS', tags: ['AWS', 'FinOps', 'Cloud'] },
  { en: 'Helm Chart Best Practices', es: 'Mejores prácticas para Helm Charts', tags: ['Kubernetes', 'Helm', 'DevOps'] },
  { en: 'Zero-Downtime Deployments with Kubernetes', es: 'Despliegues sin downtime con Kubernetes', tags: ['Kubernetes', 'DevOps', 'SRE'] },
]

function getTopic() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return TOPICS[dayOfYear % TOPICS.length]
}

function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Anthropic API call ──────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  const apiKey = ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ── Blog post generators ────────────────────────────────────────────────────
const EN_SYSTEM = `You are a senior DevOps engineer and technical writer for LRA Cloud Operations.
Write practical, technical blog posts in English.
Always respond with a valid Markdown document (no frontmatter) that covers:
1. Problem/context (2-3 paragraphs)
2. Solution approach with code examples
3. Key takeaways (3-5 bullet points)
Minimum 400 words. Use bash/yaml/hcl code blocks where relevant.`

const ES_SYSTEM = `Eres un ingeniero DevOps senior y escritor técnico de LRA Cloud Operations.
Escribe artículos técnicos prácticos en español.
Responde siempre con un documento Markdown válido (sin frontmatter) que cubra:
1. Problema/contexto (2-3 párrafos)
2. Enfoque de solución con ejemplos de código
3. Conclusiones clave (3-5 puntos)
Mínimo 400 palabras. Usa bloques bash/yaml/hcl donde sea relevante.`

async function generateEN(topic) {
  return callClaude(EN_SYSTEM, `Write a blog post about: "${topic.en}"`)
}

async function generateES(topic) {
  return callClaude(ES_SYSTEM, `Escribe un artículo sobre: "${topic.es}"`)
}

// ── File writers ────────────────────────────────────────────────────────────
function writeBlogPost(dir, slug, frontmatter, body) {
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${slug}.md`)
  const content = `---\n${Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')}\n---\n\n${body.trim()}\n`
  fs.writeFileSync(filePath, content, 'utf8')
  return filePath
}

function updateLog(entry) {
  let log = []
  if (fs.existsSync(LOG_PATH)) {
    try { log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')) } catch { log = [] }
  }
  log.unshift(entry)
  // Keep last 30 entries
  fs.writeFileSync(LOG_PATH, JSON.stringify(log.slice(0, 30), null, 2), 'utf8')
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const today = todayISO()
  const topic = getTopic()
  const slugBase = `${toSlug(topic.en)}-${today}`

  console.log(`[daily-agent] Date: ${today}`)
  console.log(`[daily-agent] Topic EN: ${topic.en}`)
  console.log(`[daily-agent] Topic ES: ${topic.es}`)

  try {
    console.log('[daily-agent] Generating EN post...')
    const enBody = await generateEN(topic)

    console.log('[daily-agent] Generating ES post...')
    const esBody = await generateES(topic)

    // Write EN
    const enDir = path.join(ROOT, 'src/content/blog')
    const enFile = writeBlogPost(enDir, slugBase, {
      titulo: topic.en,
      descripcion: `${topic.en}: practical guide for DevOps engineers and platform teams.`,
      fecha: today,
      tags: topic.tags,
      draft: false,
    }, enBody)
    console.log(`[daily-agent] ✓ EN: ${enFile}`)

    // Write ES
    const esDir = path.join(ROOT, 'src/content/es/blog')
    const esFile = writeBlogPost(esDir, slugBase, {
      titulo: topic.es,
      descripcion: `${topic.es}: guía práctica para ingenieros DevOps y equipos de plataforma.`,
      fecha: today,
      tags: topic.tags,
      draft: false,
    }, esBody)
    console.log(`[daily-agent] ✓ ES: ${esFile}`)

    updateLog({
      date: today,
      status: 'success',
      topic: topic.en,
      slug: slugBase,
      files: [enFile, esFile],
    })

    console.log('[daily-agent] ✅ Done')
  } catch (err) {
    console.error(`[daily-agent] ✗ Error: ${err.message}`)
    updateLog({ date: today, status: 'error', topic: topic.en, error: err.message })
    process.exit(1)
  }
}

main()
