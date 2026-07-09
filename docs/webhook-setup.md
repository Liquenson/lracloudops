# Webhook Worker — Setup

## Real flow (client-triggered, not server-to-server)

The contact form (`/contact`, `/es/contacto`) is a native HTML form that
POSTs directly to Web3Forms — there is no server-side Web3Forms webhook
configured. Instead, client-side JS on the page fires a second, parallel
request straight to this Worker when a GitHub repo is provided:

1. Client fills `/contact` with a GitHub repo (`org/repo` format) and submits.
2. The browser does two things at once:
   - Native form POST to Web3Forms (emails the message to `info@lracloudops.com`,
     then redirects back to `/contact?success=true`, showing the success panel).
   - `fetch()` to this Worker with `keepalive: true` (survives the page
     navigating away right after submit).
3. The Worker validates the payload and dispatches the `smart-scan.yml`
   GitHub Actions workflow (`workflow_dispatch`).
4. Smart Scan runs a real `lra scan` (Trivy + Checkov) and generates an AI
   executive report.
5. Resend emails the report to the client. If `RESEND_API_KEY` isn't
   configured yet, the report is printed to the Actions log instead.

There is no automatic notification to `info@lracloudops.com` beyond the
Web3Forms message itself — the Smart Scan pipeline currently only emails
the client.

## Deploy

```bash
cd /c/Users/lique/workspace/lracloudops/workers/webhook
npx wrangler deploy
```

## Secrets required in the Cloudflare Worker

```bash
npx wrangler secret put GITHUB_TOKEN
# Needs `actions:write` on Liquenson/lracloudops to dispatch smart-scan.yml.
# Reusing AGENT_GITHUB_TOKEN (from GitHub Secrets) works, but a token scoped
# only to this repo's Actions is safer — this Worker's secret store is a
# different trust boundary than GitHub Actions secrets.
```

`ANTHROPIC_API_KEY` is **not** needed here — the Worker only dispatches the
workflow; the AI report generation happens inside the GitHub Actions run,
using the `ANTHROPIC_API_KEY` GitHub secret already configured there.

## Worker URL

`https://lracloudops-webhook.liquenson-cloud.workers.dev`

This is only live after the `wrangler deploy` above. Until then, the
`fetch()` call from the contact form will fail — harmlessly, since it's
wrapped in a try/catch and doesn't block the Web3Forms submission.

## CSP

`public/_headers` already whitelists this Worker's origin in `connect-src`
so the browser's CSP doesn't block the client-side `fetch()`.

## Known limitation — no request authentication

This endpoint is called directly from browser JS, so it cannot carry a
secret that stays secret (anyone can read it from the page source or the
network tab and replay the exact request from `curl`). Today it only does
basic hygiene checks (email format, `org/repo` format) — not real auth.

Worst case: someone scripts requests directly against the Worker with an
arbitrary email + a public repo, which would send that address an
unsolicited "security audit" email from LRA CloudOps and burn GitHub
Actions minutes + Anthropic API spend per request.

Recommended follow-up if this becomes a problem: add Cloudflare Turnstile
to the contact form (the CSP already whitelists `challenges.cloudflare.com`
for this, from an earlier integration) and verify the token server-side in
the Worker before dispatching.

## Manual steps still pending

- [ ] `npx wrangler deploy` from `workers/webhook/` (not yet deployed)
- [ ] `npx wrangler secret put GITHUB_TOKEN` on the `lracloudops-webhook` Worker
- [ ] `RESEND_API_KEY` GitHub secret on `Liquenson/lracloudops` (still pending
      from the Smart Scan setup — without it, reports are logged, not emailed)
