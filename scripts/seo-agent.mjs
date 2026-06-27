import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim()

async function callClaude(prompt) {
  if (!ANTHROPIC_API_KEY) return null
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

async function run() {
  console.log('🔍 SEO Agent:', new Date().toISOString())

  const pages = await glob('src/pages/*.astro')
  const issues = []

  for (const page of pages.slice(0, 20)) {
    const content = fs.readFileSync(page, 'utf8')
    const name = path.basename(page)
    if (!content.includes('titulo=') && !content.includes('titulo:')) {
      issues.push({ page: name, issue: 'Missing titulo prop' })
    }
    if (!content.includes('descripcion=') && !content.includes('descripcion:')) {
      issues.push({ page: name, issue: 'Missing descripcion prop' })
    }
  }

  console.log(`📊 SEO issues found: ${issues.length}`)

  let recommendations = null
  if (ANTHROPIC_API_KEY) {
    const blogFiles = await glob('src/content/blog/*.md')
    const recentBlogs = blogFiles.slice(-5).map((f) => {
      const m = fs.readFileSync(f, 'utf8').match(/titulo:\s*["']?([^"'\n]+)/)
      return m?.[1] || path.basename(f)
    })

    const response = await callClaude(`SEO specialist for lracloudops.com — a DevOps and Platform Engineering consultancy targeting Spanish and English-speaking markets.
Issues found: ${issues.map((i) => `${i.page}: ${i.issue}`).join(', ') || 'none'}
Recent blog posts: ${recentBlogs.join(', ')}
Suggest 3 high-SEO blog topics and 3 keyword opportunities for DevOps/Cloud consulting.
JSON only: {"blog_topics":["t1","t2","t3"],"keywords":["k1","k2","k3"],"summary":"1 line"}`)

    if (response) {
      try { recommendations = JSON.parse(response.replace(/```json|```/g, '').trim()) } catch {}
    }
  }

  const report = {
    date: new Date().toISOString(),
    pages_analyzed: pages.length,
    issues: issues.length,
    recommendations,
    status: issues.length === 0 ? 'good' : 'needs-attention',
  }

  const logPath = 'scripts/seo-log.json'
  let logs = []
  if (fs.existsSync(logPath)) {
    try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8')) } catch {}
  }
  logs.unshift(report)
  logs = logs.slice(0, 52)
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))

  if (recommendations) {
    const date = new Date().toISOString().split('T')[0]
    const reportContent = `# SEO Report ${date}

Issues found: ${issues.length}
Pages analyzed: ${pages.length}

## Recommended Blog Topics
${recommendations.blog_topics?.map((t) => `- ${t}`).join('\n') || '—'}

## Target Keywords
${recommendations.keywords?.join(', ') || '—'}

## Summary
${recommendations.summary || '—'}
`
    fs.writeFileSync(`scripts/AUDIT_SEO_${date}.md`, reportContent)
    console.log(`📝 SEO report saved: scripts/AUDIT_SEO_${date}.md`)
  }

  console.log('✅ SEO Agent done:', report.status)
  return report
}

run().catch((e) => { console.error('SEO error:', e.message); process.exit(0) })
