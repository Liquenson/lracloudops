import fs from 'fs'
import { glob } from 'glob'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function callClaude(prompt) {
  if (!ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set — skipping AI generation')
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    console.error('Anthropic API error:', res.status, await res.text())
    return null
  }
  const data = await res.json()
  return data.content?.[0]?.text || null
}

async function repurposeLatestPost() {
  console.log('📝 Content Repurposing Agent iniciado...')

  const posts = await glob('src/content/blog/*.md')
  if (posts.length === 0) {
    console.log('No blog posts found.')
    return
  }

  const latest = posts.sort().reverse()[0]
  const content = fs.readFileSync(latest, 'utf8')
  const titleMatch = content.match(/title:\s*["']?([^"'\n]+)/)
  const title = titleMatch?.[1]?.trim() || 'Latest post'
  const bodyText = content.replace(/---[\s\S]*?---/, '').slice(0, 2000)

  console.log(`📄 Processing: ${title}`)

  const prompt = `Eres el Content Manager de LRA Cloud Operations, una consultora DevOps especializada en AWS, Kubernetes, Terraform y CI/CD.

Artículo del blog:
Título: ${title}
Contenido: ${bodyText}

Genera contenido para redes sociales en JSON:
{
  "linkedin_post": "post profesional de LinkedIn de 150-200 palabras con emojis técnicos relevantes (🚀 ☁️ 🔧 ⚙️ 🛡️ 📊), enfocado en el valor para equipos de ingeniería, con 5-7 hashtags DevOps al final",
  "twitter_thread": ["tweet 1 con hook fuerte (problema o dato)", "tweet 2 (solución o insight)", "tweet 3 (ejemplo concreto o código)", "tweet 4 CTA → lracloudops.com"],
  "key_takeaways": ["takeaway práctico 1", "takeaway práctico 2", "takeaway práctico 3"],
  "hashtags": ["#DevOps", "#Kubernetes", "#AWS", "#CloudOps", "#LRACloudOps", "#Terraform", "#Platform Engineering"]
}

Responde SOLO con JSON válido, sin markdown.`

  const result = await callClaude(prompt)
  if (!result) return

  let parsed
  try {
    const clean = result.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch (e) {
    console.error('Error parsing Claude response:', e.message)
    console.log('Raw response:', result.slice(0, 200))
    return
  }

  const date = new Date().toISOString().split('T')[0]
  const logPath = 'scripts/content-log.json'
  let logs = []
  if (fs.existsSync(logPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'))
    } catch {
      logs = []
    }
  }

  logs.unshift({ date, title, source_file: latest, ...parsed })
  logs = logs.slice(0, 30)

  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
  console.log('✅ Content repurposed successfully')
  console.log(`📋 Title: ${title}`)
  console.log(`📣 LinkedIn preview: ${parsed.linkedin_post?.slice(0, 120)}...`)
  console.log(`🐦 Thread tweets: ${parsed.twitter_thread?.length ?? 0}`)
  console.log(`💡 Takeaways: ${parsed.key_takeaways?.length ?? 0}`)
}

repurposeLatestPost().catch((e) => {
  console.error('Content agent error:', e.message)
  process.exit(0)
})
