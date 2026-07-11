# LRA CloudOps — lracloudops.com

Corporate website for LRA CloudOps, a Platform Engineering consultancy
led by Ruben Liquenson, based in Las Palmas de Gran Canaria, Spain.

## Stack

- **Framework:** Astro 6 + TypeScript
- **Styles:** Tailwind CSS 4 (inline styles) + Red Hat Display/Text/Mono
- **Animations:** GSAP 3 + ScrollTrigger + Lenis
- **Deploy:** Cloudflare Pages (auto-deploy on push to main)
- **Workers:** 2 Cloudflare Workers (chat agent + webhook)
- **CI:** GitHub Actions (build + smart-scan + daily sync)

## Structure

```
src/
├── pages/          # 29 pages — EN (root) + ES (/es/)
├── components/     # Header, Footer, ChatWidget, Logo
├── layouts/        # Layout.astro (single base layout)
├── lib/            # github.ts (build-time API), tagColors.ts
├── data/           # industry-diagrams.ts (SVG diagrams)
├── scripts/        # animations.ts (Lenis + GSAP)
└── styles/         # global.css (Design System v4)

workers/
└── webhook/        # Cloudflare Worker — triggers Smart Scan
```

## Projects featured

| Project | Layer | Maturity |
|---------|-------|---------|
| [lra-ai-platform](https://github.com/lra-cloud-ops/lra-ai-platform) | AI Orchestration | Core Platform |
| [aws-terraform-devops](https://github.com/lra-cloud-ops/aws-terraform-devops) | Infrastructure | Core Platform |
| [k8s-on-premise](https://github.com/lra-cloud-ops/k8s-on-premise) | Runtime | Supporting |
| [aws-devops-agent](https://github.com/lra-cloud-ops/aws-devops-agent) | Automation | Lab |

## Smart Scan

The free infrastructure audit is powered by `lra-ai-platform/scripts/smart_scan.py`.

Flow:
```
/contact form → Cloudflare Worker (webhook) →
GitHub Actions (smart-scan.yml) →
Trivy + Checkov + Claude Haiku →
Email report via Resend
```

## Development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # Production build
npm run preview    # Preview production build
```

## Deploy

Push to `main` → Cloudflare Pages auto-deploys.
Daily rebuild at 06:00 UTC refreshes GitHub API data (stars, commits).

## Environment variables (Cloudflare Pages)

| Variable | Purpose |
|----------|---------|
| GITHUB_TOKEN | GitHub API rate limit (5000/hr vs 60/hr) |
| ANTHROPIC_API_KEY | Smart Scan AI report generation |
| RESEND_API_KEY | Smart Scan email delivery |
| PUBLIC_GA_ID | Google Analytics GA4 |
| PUBLIC_CF_BEACON | Cloudflare Web Analytics |

## Legal

- Privacy Policy: /privacy · /es/privacidad
- Terms of Service: /terms · /es/terminos
- GDPR compliant — data processed in EU
