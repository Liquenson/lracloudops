import fs from 'fs'
import { execSync } from 'child_process'

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
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || null
}

async function run() {
  console.log('🔧 Error Fix Agent:', new Date().toISOString())

  try {
    execSync('npx prettier --write "src/**/*.{astro,ts,css}" 2>/dev/null', { stdio: 'pipe' })
    console.log('✅ Prettier auto-fixed')
  } catch {}

  let buildErrors = ''
  try {
    execSync('npm run build 2>&1', { stdio: 'pipe' })
    console.log('✅ Build OK — no errors')
    return { status: 'ok', fixes: [] }
  } catch (e) {
    buildErrors = e.stdout?.toString() || e.message
    console.log('❌ Build failed — analyzing...')
  }

  let tsErrors = ''
  try {
    execSync('npx astro check 2>&1', { stdio: 'pipe' })
  } catch (e) {
    tsErrors = e.stdout?.toString() || ''
  }

  if ((buildErrors || tsErrors) && ANTHROPIC_API_KEY) {
    const prompt = `Astro project has build errors. Analyze and suggest fixes.

BUILD ERRORS:
${buildErrors.slice(0, 1500)}

TYPESCRIPT ERRORS:
${tsErrors.slice(0, 500)}

Respond in JSON only:
{
  "analysis": "brief description",
  "fixes": [{"file": "path", "search": "exact text", "replacement": "new text"}],
  "confidence": 0
}`

    const response = await callClaude(prompt)
    if (response) {
      try {
        const result = JSON.parse(response.replace(/```json|```/g, '').trim())
        console.log('🤖 Analysis:', result.analysis, `(${result.confidence}% confidence)`)

        for (const fix of result.fixes || []) {
          if (fix.file && fs.existsSync(fix.file) && fix.search) {
            let content = fs.readFileSync(fix.file, 'utf8')
            if (content.includes(fix.search)) {
              content = content.replace(fix.search, fix.replacement || '')
              fs.writeFileSync(fix.file, content)
              console.log(`✅ Fixed: ${fix.file}`)
            }
          }
        }

        try {
          execSync('npm run build 2>&1', { stdio: 'pipe' })
          console.log('✅ Build OK after fixes')
          return { status: 'fixed', confidence: result.confidence }
        } catch {
          console.log('⚠ Build still failing after fixes')
          return { status: 'partial' }
        }
      } catch {}
    }
  }

  return { status: 'no-fix', errors: buildErrors.slice(0, 200) }
}

run()
  .then((result) => {
    const logPath = 'scripts/error-fix-log.json'
    let logs = []
    if (fs.existsSync(logPath)) {
      try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8')) } catch {}
    }
    logs.unshift({ date: new Date().toISOString(), ...result })
    logs = logs.slice(0, 30)
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
    console.log('✅ Error Fix Agent done:', result.status)
  })
  .catch((e) => { console.error('Error:', e.message); process.exit(0) })
