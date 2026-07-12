# LRA CloudOps — Architecture

## Overview

lracloudops.com is a static site (Astro 6 + Cloudflare Pages)
with two external Cloudflare Workers and GitHub Actions automation.

## Site Architecture

```
Visitor
  │
  ▼
Cloudflare Pages (lracloudops.com)
  │
  ├── ChatWidget → lracloudops-agent.liquenson-cloud.workers.dev
  │                (Claude Haiku — DevOps advisor)
  │
  └── /contact form → lracloudops-webhook.liquenson-cloud.workers.dev
                       │
                       └── GitHub Actions smart-scan.yml
                             │
                             ├── lra-ai-platform/scripts/smart_scan.py
                             ├── Trivy + Checkov
                             └── Resend email → client
```

## GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| build.yml | push to main, PRs | astro check + astro build + page count |
| smart-scan.yml | webhook / manual | Security audit + AI report |
| sync-github.yml | daily 06:00 UTC | Force rebuild — refresh GitHub API data |

## Data Flow

```
Build time:
  src/lib/github.ts → GitHub API → project stats injected into pages

Runtime:
  ChatWidget → Cloudflare Worker → Anthropic API → response
  Contact form → Cloudflare Worker → GitHub Actions → scan → email
```

## i18n

- English: root (/) — no prefix
- Spanish: /es/ prefix
- Route mapping: hardcoded routeMap in src/layouts/Layout.astro
- hreflang: generated from routeMap

## Design System v4

- Primary: #1A73E8
- Text: #202124 / #5F6368
- Border: #DADCE0 / Background: #F8F9FA
- Success: #137333 / Warning: #F29900 / Error: #C5221F
- Fonts: Red Hat Display + Red Hat Text + Red Hat Mono
- Animations: Lenis + GSAP ScrollTrigger

## Project Maturity

| Project | Maturity | Layer |
|---------|---------|-------|
| lra-ai-platform | Core Platform | AI Orchestration |
| aws-terraform-devops | Core Platform | Infrastructure |
| k8s-on-premise | Supporting | Runtime |
| aws-devops-agent | Lab | Automation |

## Security

- CSP in public/_headers
- rel="noopener noreferrer" on all external links
- No secrets in codebase (.env.local in .gitignore)
- Secrets in Cloudflare Pages + Workers environment variables

## Known issues resolved (July 2026)

- CSS variables in :root updated to Design System v4 (#1A73E8)
- Red Hat fonts: single source via @fontsource (Google Fonts link removed)
- GA4 ID: now read from PUBLIC_GA_ID environment variable
- CI pipeline: astro check added as explicit step before build
- Home and pricing meta descriptions updated to Platform Engineering narrative
