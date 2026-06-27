import fs from 'fs'
import { execSync } from 'child_process'

async function run() {
  console.log('📦 Deps Agent:', new Date().toISOString())

  let auditData = {}
  try {
    const out = execSync('npm audit --json 2>/dev/null', { stdio: 'pipe' }).toString()
    auditData = JSON.parse(out)
  } catch (e) {
    try { auditData = JSON.parse(e.stdout?.toString() || '{}') } catch {}
  }

  const vulns = auditData.metadata?.vulnerabilities || {}
  console.log(`🔒 Vulns: critical(${vulns.critical || 0}) high(${vulns.high || 0}) moderate(${vulns.moderate || 0})`)

  if ((vulns.critical || 0) + (vulns.high || 0) > 0) {
    try {
      execSync('npm audit fix 2>/dev/null', { stdio: 'pipe' })
      console.log('✅ npm audit fix applied')
    } catch {}
  }

  let buildOk = false
  try {
    execSync('npm run build 2>&1', { stdio: 'pipe' })
    buildOk = true
    console.log('✅ Build OK after updates')
  } catch {
    console.log('❌ Build broke — reverting package changes')
    try {
      execSync('git checkout package.json package-lock.json 2>/dev/null', { stdio: 'pipe' })
      execSync('npm ci 2>/dev/null', { stdio: 'pipe' })
    } catch {}
  }

  const report = {
    date: new Date().toISOString(),
    vulnerabilities: vulns,
    build_ok: buildOk,
    status: (vulns.critical || 0) + (vulns.high || 0) === 0 ? 'clean' : 'has-vulns',
  }

  const logPath = 'scripts/deps-log.json'
  let logs = []
  if (fs.existsSync(logPath)) {
    try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8')) } catch {}
  }
  logs.unshift(report)
  logs = logs.slice(0, 52)
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))

  console.log('✅ Deps Agent done:', report.status)
  return report
}

run().catch((e) => { console.error('Deps error:', e.message); process.exit(0) })
