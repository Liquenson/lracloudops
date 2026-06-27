import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { glob } from 'glob'

const TASK = process.env.TASK || 'full'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

console.log(`🤖 LRA Orchestrator — Tarea: ${TASK}`)
console.log(`📅 ${new Date().toISOString()}`)

async function callClaude(prompt) {
  if (!ANTHROPIC_API_KEY) {
    console.log('⚠ ANTHROPIC_API_KEY not set')
    return null
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || null
}

async function checkBuild() {
  try {
    execSync('npm run build 2>&1', { stdio: 'pipe' })
    const pages = execSync('find dist -name "*.html" | wc -l').toString().trim()
    console.log(`✅ Build OK: ${pages} páginas`)
    return { status: 'ok', pages: parseInt(pages) }
  } catch (e) {
    console.log('❌ Build FAILED')
    return { status: 'error', error: e.message.slice(0, 200) }
  }
}

async function checkInternalLinks() {
  const broken = []
  try {
    const files = await glob('src/pages/**/*.astro')
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      const matches = [...content.matchAll(/href="(\/[^"#?]+)"/g)]
      for (const m of matches) {
        const href = m[1]
        if (href.includes('.') || href.startsWith('/api')) continue
        const esPath = path.join('src/pages', href.replace(/^\//, ''))
        const exists =
          fs.existsSync(esPath + '.astro') ||
          fs.existsSync(esPath + '/index.astro')
        if (!exists) broken.push({ file: file.replace('src/', ''), href })
      }
    }
  } catch (e) {
    console.log('Link check error:', e.message)
  }
  console.log(`🔗 Links rotos encontrados: ${broken.length}`)
  return { broken: broken.length, links: broken.slice(0, 5) }
}

async function checkESENParity() {
  const esPages = (await glob('src/pages/*.astro')).map((f) => path.basename(f))
  const enPages = (await glob('src/pages/en/*.astro')).map((f) =>
    path.basename(f)
  )
  const missingEN = esPages.filter(
    (n) => !enPages.includes(n) && n !== '404.astro'
  )
  const missingES = enPages.filter(
    (n) => !esPages.includes(n) && n !== '404.astro'
  )
  console.log(
    `🌐 Paridad ES↔EN: falta EN(${missingEN.length}) ES(${missingES.length})`
  )
  return { missingEN, missingES }
}

async function checkPlaceholders() {
  try {
    const result = execSync(
      'grep -rn "PLACEHOLDER\\|TODO\\|FIXME" src/ --include="*.astro" --include="*.ts" 2>/dev/null | wc -l'
    )
      .toString()
      .trim()
    const count = parseInt(result)
    console.log(`📋 Placeholders encontrados: ${count}`)
    return { count }
  } catch {
    return { count: 0 }
  }
}

async function weeklyAudit(checks) {
  const prompt = `Eres el auditor de lracloudops.com, una consultora DevOps con 15 agentes de IA.

Estado del sitio hoy ${new Date().toISOString().split('T')[0]}:
- Build: ${checks.build?.status} (${checks.build?.pages} páginas)
- Links rotos: ${checks.links?.broken}
- Paridad ES/EN: falta EN(${checks.parity?.missingEN?.length}) ES(${checks.parity?.missingES?.length})
- Placeholders: ${checks.placeholders?.count}

Genera un informe de auditoría semanal en JSON:
{
  "score": 0-10,
  "status": "healthy|warning|critical",
  "top_issues": ["issue 1", "issue 2", "issue 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "summary": "resumen de 2 líneas"
}

Responde SOLO con el JSON, sin markdown.`

  const response = await callClaude(prompt)
  if (!response) return null

  try {
    const audit = JSON.parse(response.replace(/```json|```/g, '').trim())
    const date = new Date().toISOString().split('T')[0]
    const auditPath = `AUDIT_WEEKLY_${date}.md`
    fs.writeFileSync(
      auditPath,
      `# Auditoría Semanal — ${date}\n\nScore: ${audit.score}/10\nStatus: ${audit.status}\n\n## Issues\n${audit.top_issues.map((i) => `- ${i}`).join('\n')}\n\n## Recomendaciones\n${audit.recommendations.map((r) => `- ${r}`).join('\n')}\n\n## Resumen\n${audit.summary}`
    )
    console.log(`📊 Auditoría guardada: ${auditPath}`)
    return audit
  } catch (e) {
    console.log('Error parseando auditoría:', e.message)
    return null
  }
}

async function run() {
  const results = {
    date: new Date().toISOString(),
    task: TASK,
    checks: {},
  }

  if (TASK === 'full' || TASK === 'health-check') {
    results.checks.build = await checkBuild()
    results.checks.links = await checkInternalLinks()
    results.checks.parity = await checkESENParity()
    results.checks.placeholders = await checkPlaceholders()
  }

  if (TASK === 'weekly-audit') {
    results.checks.build = await checkBuild()
    results.checks.links = await checkInternalLinks()
    results.checks.parity = await checkESENParity()
    results.checks.placeholders = await checkPlaceholders()
    results.audit = await weeklyAudit(results.checks)
  }

  const logPath = 'scripts/orchestrator-log.json'
  let logs = []
  if (fs.existsSync(logPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'))
    } catch {}
  }
  logs.unshift(results)
  logs = logs.slice(0, 90)
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))

  console.log('✅ Orquestador completado')
  return results
}

run().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
