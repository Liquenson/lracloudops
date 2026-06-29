import fs from 'fs'
import { execSync } from 'child_process'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

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
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || null
}

async function fixErrors() {
  console.log('🔧 Error Fix Agent started...')
  let buildErrors = ''
  try {
    execSync('npm run build 2>&1', { stdio: 'pipe' })
    console.log('✅ Build OK — no errors')
    return { status: 'ok', fixes: [] }
  } catch (e) {
    buildErrors = e.stdout?.toString() || e.message
    console.log('❌ Build FAILED — analyzing...')
  }

  try {
    execSync('npx prettier --write "src/**/*.{astro,ts,css}" 2>/dev/null', {
      stdio: 'pipe',
    })
    console.log('🔧 Prettier auto-fixed')
  } catch {}

  if (buildErrors && ANTHROPIC_API_KEY) {
    const prompt = `Astro + TypeScript + Tailwind project has build errors:
${buildErrors.slice(0, 2000)}

Analyze and provide fixes in JSON:
{"analysis":"brief description","fixes":[{"file":"path/file.astro","type":"replace","search":"exact text","replacement":"fixed text","description":"what this fixes"}],"commands":[],"confidence":0-100}
Respond ONLY with JSON.`

    const response = await callClaude(prompt)
    if (response) {
      try {
        const result = JSON.parse(response.replace(/```json|```/g, '').trim())
        console.log(
          `🤖 Claude: ${result.analysis} (${result.confidence}% confidence)`
        )
        const appliedFixes = []
        for (const fix of result.fixes || []) {
          if (!fs.existsSync(fix.file)) continue
          let content = fs.readFileSync(fix.file, 'utf8')
          if (
            fix.type === 'replace' &&
            fix.search &&
            content.includes(fix.search)
          ) {
            content = content.replace(fix.search, fix.replacement || '')
            fs.writeFileSync(fix.file, content)
            appliedFixes.push(`Fixed ${fix.file}: ${fix.description}`)
          }
        }
        try {
          execSync('npm run build 2>&1', { stdio: 'pipe' })
          return { status: 'fixed', fixes: appliedFixes }
        } catch (e) {
          return { status: 'partial', fixes: appliedFixes }
        }
      } catch (e) {
        return { status: 'parse-error', fixes: [] }
      }
    }
  }
  return { status: 'ok', fixes: [] }
}

fixErrors()
  .then((result) => {
    const logPath = 'scripts/error-fix-log.json'
    let logs = []
    if (fs.existsSync(logPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'))
      } catch {}
    }
    logs.unshift({ date: new Date().toISOString(), ...result })
    logs = logs.slice(0, 30)
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
    console.log('✅ Error Fix Agent done:', result.status)
  })
  .catch((e) => {
    console.error('Error Fix Agent failed:', e.message)
    process.exit(0)
  })
