/**
 * LRA CloudOps — Contact Form Webhook Worker
 *
 * Public browser endpoint. CORS is not authentication; configure Cloudflare
 * rate limiting / Turnstile before treating this endpoint as abuse-resistant.
 */
export interface Env {
  GITHUB_TOKEN: string
  RESEND_API_KEY?: string
}

interface WebhookPayload {
  name?: unknown
  email?: unknown
  github_repo?: unknown
  topic?: unknown
}

const ALLOWED_ORIGIN = 'https://lracloudops.com'
const MAX_BODY_BYTES = 8 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REPO_RE = /^[\w.-]+\/[\w.-]+$/

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() })
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

async function triggerSmartScan(repo: string, email: string, name: string, env: Env): Promise<boolean> {
  const response = await fetch(
    'https://api.github.com/repos/Liquenson/lracloudops/actions/workflows/smart-scan.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'LRA-CloudOps-Webhook/1.0',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { repo_url: repo, client_email: email, client_name: name },
      }),
    }
  )
  return response.status === 204
}

async function notifyInternal(name: string, email: string, repo: string, env: Env): Promise<void> {
  if (!env.RESEND_API_KEY) return

  try {
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeRepo = escapeHtml(repo)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LRA CloudOps Alerts <info@lracloudops.com>',
        to: ['info@lracloudops.com'],
        subject: `New audit request — ${name.slice(0, 100)}`,
        html: `
          <h2>New Smart Scan Request</h2>
          <p><strong>Client:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Repo:</strong> <code>${safeRepo}</code></p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p>Smart Scan triggered automatically.</p>
          <a href="https://github.com/Liquenson/lracloudops/actions">View Actions</a>
        `,
      }),
    })
  } catch (error) {
    console.error('Internal alert delivery failed', error instanceof Error ? error.name : 'unknown')
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }
    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405)
    }

    const origin = request.headers.get('Origin')
    if (origin && origin !== ALLOWED_ORIGIN && origin !== 'https://www.lracloudops.com') {
      return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403)
    }

    const contentType = request.headers.get('Content-Type') || ''
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return jsonResponse({ ok: false, error: 'unsupported_media_type' }, 415)
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: 'payload_too_large' }, 413)
    }

    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return jsonResponse({ ok: false, error: 'invalid_request_body' }, 400)
    }
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: 'payload_too_large' }, 413)
    }

    let payload: WebhookPayload
    try {
      const parsed: unknown = JSON.parse(rawBody)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return jsonResponse({ ok: false, error: 'invalid_payload' }, 400)
      }
      payload = parsed as WebhookPayload
    } catch {
      return jsonResponse({ ok: false, error: 'invalid_json' }, 400)
    }

    if (payload.name !== undefined && typeof payload.name !== 'string') {
      return jsonResponse({ ok: false, error: 'invalid_name' }, 400)
    }
    if (typeof payload.email !== 'string') {
      return jsonResponse({ ok: false, error: 'invalid_email' }, 400)
    }
    if (payload.github_repo !== undefined && typeof payload.github_repo !== 'string') {
      return jsonResponse({ ok: false, error: 'invalid_repo_format' }, 400)
    }

    const name = (payload.name || 'Client').trim().slice(0, 200) || 'Client'
    const email = payload.email.trim()
    const repo = (payload.github_repo || '').trim()

    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return jsonResponse({ ok: false, error: 'invalid_email' }, 400)
    }
    if (!repo) return jsonResponse({ ok: true, action: 'contact_only' })
    if (repo.length > 200 || !REPO_RE.test(repo)) {
      return jsonResponse({ ok: false, error: 'invalid_repo_format' }, 400)
    }

    try {
      const triggered = await triggerSmartScan(repo, email, name, env)
      if (!triggered) {
        console.error('Smart Scan dispatch failed', { repo })
        return jsonResponse({ ok: false, error: 'scan_dispatch_failed' }, 502)
      }
      await notifyInternal(name, email, repo, env)
      return jsonResponse({ ok: true, action: 'smart_scan_triggered', repo })
    } catch (error) {
      console.error('Smart Scan dispatch error', error instanceof Error ? error.name : 'unknown')
      return jsonResponse({ ok: false, error: 'internal_error' }, 500)
    }
  },
}
