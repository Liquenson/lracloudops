import fs from 'fs'

const SITE_URL = 'https://lracloudops.com'
const PAGES = [
  '/',
  '/about',
  '/services',
  '/contact',
  '/blog',
  '/pricing',
  '/infrastructure-review',
  '/proposal',
  '/cost-optimizer',
  '/learn',
  '/security-audit',
  '/aws-architect',
  '/es/',
  '/es/nosotros',
  '/es/servicios',
]

async function checkPage(path) {
  const url = SITE_URL + path
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'LRA-Uptime/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    return {
      url,
      status: res.status,
      ok: res.ok,
      ms: Date.now() - start,
      slow: Date.now() - start > 3000,
    }
  } catch (e) {
    return {
      url,
      status: 0,
      ok: false,
      error: e.message,
      ms: Date.now() - start,
    }
  }
}

async function runCheck() {
  console.log('🔍 Uptime Agent started...')
  const results = await Promise.all(PAGES.map(checkPage))
  const failed = results.filter((r) => !r.ok)
  const slow = results.filter((r) => r.ok && r.slow)
  const avg = Math.round(
    results.filter((r) => r.ok).reduce((a, r) => a + r.ms, 0) /
      (results.filter((r) => r.ok).length || 1)
  )
  console.log(
    `✅ OK: ${results.filter((r) => r.ok).length}/${results.length} | ❌ Failed: ${failed.length} | ⚡ Avg: ${avg}ms`
  )
  if (failed.length > 0)
    failed.forEach((r) => console.log(`  ❌ ${r.url} (${r.status})`))
  const report = {
    date: new Date().toISOString(),
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: failed.length,
    slow: slow.length,
    avg_ms: avg,
    status:
      failed.length === 0
        ? 'healthy'
        : failed.length < 3
          ? 'degraded'
          : 'critical',
    failed_pages: failed.map((r) => r.url),
  }
  const logPath = 'scripts/uptime-log.json'
  let logs = []
  if (fs.existsSync(logPath)) {
    try {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'))
    } catch {}
  }
  logs.unshift(report)
  logs = logs.slice(0, 168)
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
  if (report.status === 'critical') process.exit(1)
  return report
}

runCheck().catch((e) => {
  console.error('Uptime check failed:', e.message)
  process.exit(0)
})
