import fs from 'fs'
import { execSync } from 'child_process'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function updateDependencies() {
  console.log('📦 Dependencies Agent started...')
  let auditOutput = ''
  try {
    auditOutput = execSync('npm audit --json 2>/dev/null').toString()
  } catch (e) {
    auditOutput = e.stdout?.toString() || ''
  }
  let auditData = {}
  try {
    auditData = JSON.parse(auditOutput)
  } catch {}
  const vulns = auditData.metadata?.vulnerabilities || {}
  console.log(
    `🔒 Vulnerabilities: critical(${vulns.critical || 0}) high(${vulns.high || 0}) moderate(${vulns.moderate || 0})`
  )
  if ((vulns.critical || 0) + (vulns.high || 0) > 0) {
    try {
      execSync('npm audit fix 2>/dev/null', { stdio: 'pipe' })
      console.log('🔧 npm audit fix applied')
    } catch {}
  }
  try {
    execSync('npm run build 2>&1', { stdio: 'pipe' })
    console.log('✅ Build OK after updates')
  } catch (e) {
    console.log('❌ Build broken — reverting...')
    try {
      execSync('git checkout package.json package-lock.json 2>/dev/null', {
        stdio: 'pipe',
      })
      execSync('npm ci 2>/dev/null', { stdio: 'pipe' })
    } catch {}
  }
  const report = {
    date: new Date().toISOString(),
    vulnerabilities: vulns,
    status:
      (vulns.critical || 0) + (vulns.high || 0) === 0 ? 'clean' : 'has-vulns',
  }
  const logPath = 'scripts/deps-log.json'
  let logs = []
  if (fs.existsSync(logPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'))
    } catch {}
  }
  logs.unshift(report)
  logs = logs.slice(0, 52)
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
  return report
}

updateDependencies().catch((e) => {
  console.error('Deps agent error:', e.message)
  process.exit(0)
})
