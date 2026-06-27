import fs from 'fs'

const SITE_URL = 'https://lracloudops.com'
const PAGES = [
  '/', '/servicios', '/nosotros', '/pricing', '/contacto',
  '/blog', '/infrastructure-review', '/proposal', '/cost-optimizer',
  '/learn', '/security-audit', '/aws-architect', '/agents',
  '/en/', '/en/services',
]

async function checkPage(pagePath) {
  const url = SITE_URL + pagePath
  const start = Date.now()
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LRA-Uptime/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    return { url, status: res.status, ok: res.ok, ms: Date.now() - start }
  } catch (e) {
    return { url, status: 0, ok: false, error: e.message, ms: Date.now() - start }
  }
}

async function run() {
  console.log('🔍 Uptime check:', new Date().toISOString())
  const results = await Promise.all(PAGES.map(checkPage))
  const failed = results.filter((r) => !r.ok)
  const okCount = results.filter((r) => r.ok).length
  const avgMs = Math.round(
    results.filter((r) => r.ok).reduce((a, r) => a + r.ms, 0) /
      Math.max(okCount, 1)
  )

  console.log(`✅ OK: ${okCount}/${results.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  console.log(`⚡ Avg: ${avgMs}ms`)
  if (failed.length > 0) failed.forEach((r) => console.log(`  ❌ ${r.url}: ${r.status}`))

  const report = {
    date: new Date().toISOString(),
    ok: okCount,
    failed: failed.length,
    total: results.length,
    avg_ms: avgMs,
    status: failed.length === 0 ? 'healthy' : failed.length < 3 ? 'degraded' : 'critical',
    failed_pages: failed.map((r) => r.url),
  }

  const logPath = 'scripts/uptime-log.json'
  let logs = []
  if (fs.existsSync(logPath)) {
    try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8')) } catch {}
  }
  logs.unshift(report)
  logs = logs.slice(0, 168)
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))

  console.log('✅ Uptime Agent done:', report.status)
  if (report.status === 'critical') process.exit(1)
}

run().catch((e) => { console.error('Uptime error:', e.message); process.exit(0) })
