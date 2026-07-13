/**
 * LRA CloudOps — Contact Form Webhook Worker
 *
 * Called directly from the browser (see src/pages/contact.astro and
 * src/pages/es/contacto.astro) alongside the native Web3Forms submission.
 * When the client includes a GitHub repo, this dispatches the
 * "Smart Scan" GitHub Actions workflow, which runs a real scan and emails
 * an AI-generated executive report.
 *
 * This endpoint is public and unauthenticated by design (it's called from
 * client-side JS, so no secret embedded here could stay secret). The checks
 * below are basic hygiene, not an auth boundary — see docs/webhook-setup.md
 * for the residual risk and a recommended Turnstile follow-up.
 */

export interface Env {
  GITHUB_TOKEN: string
  RESEND_API_KEY?: string
}

interface WebhookPayload {
  name?: string
  email?: string
  github_repo?: string
  topic?: string
}

const ALLOWED_ORIGIN = 'https://lracloudops.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REPO_RE = /^[\w.-]+\/[\w.-]+$/

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

async function triggerSmartScan(
  repo: string,
  email: string,
  name: string,
  env: Env
): Promise<boolean> {
  const response = await fetch(
    'https://api.github.com/repos/Liquenson/lracloudops/actions/workflows/smart-scan.yml/dispatches',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'LRA-CloudOps-Webhook/1.0',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          repo_url: repo,
          client_email: email,
          client_name: name,
        },
      }),
    }
  )

  return response.status === 204
}

// Best-effort internal alert so we notice a new scan request without checking
// the GitHub Actions tab. Optional: no-ops when RESEND_API_KEY isn't set.
async function notifyInternal(
  name: string,
  email: string,
  repo: string,
  env: Env
): Promise<void> {
  if (!env.RESEND_API_KEY) return

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LRA CloudOps Alerts <info@lracloudops.com>',
        to: ['info@lracloudops.com'],
        subject: `🔔 New audit request — ${name} · ${repo}`,
        html: `
          <h2 style="color:#1A73E8;">New Smart Scan Request</h2>
          <p><strong>Client:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Repo:</strong> <code>${repo}</code></p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <hr/>
          <p>Smart Scan triggered automatically.</p>
          <a href="https://github.com/Liquenson/lracloudops/actions"
             style="background:#1A73E8;color:#FFFFFF;padding:10px 20px;border-radius:4px;text-decoration:none;">
            View Actions →
          </a>
        `,
      }),
    })
  } catch {
    // Non-critical — fail silently
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() })
    }

    const contentType = request.headers.get('Content-Type') || ''
    if (!contentType.includes('application/json')) {
      return new Response('Unsupported Media Type', { status: 415, headers: corsHeaders() })
    }

    const headers = corsHeaders()

    let payload: WebhookPayload
    try {
      payload = await request.json()
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), { status: 400, headers })
    }

    const name = (payload.name || 'Client').slice(0, 200)
    const email = (payload.email || '').trim()
    const repo = (payload.github_repo || '').trim()

    if (!email || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), { status: 400, headers })
    }

    // No repo → nothing to scan, just acknowledge (Web3Forms already handles the message itself)
    if (!repo) {
      return new Response(JSON.stringify({ ok: true, action: 'contact_only' }), { status: 200, headers })
    }

    if (!REPO_RE.test(repo)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_repo_format' }), { status: 400, headers })
    }

    try {
      const triggered = await triggerSmartScan(repo, email, name, env)
      if (triggered) {
        await notifyInternal(name, email, repo, env)
      }
      return new Response(
        JSON.stringify({
          ok: true,
          action: triggered ? 'smart_scan_triggered' : 'smart_scan_failed',
          repo,
        }),
        { status: 200, headers }
      )
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers })
    }
  },
}
