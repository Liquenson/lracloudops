# LRA CloudOps

**Platform Engineering consultancy website for LRA CloudOps. Production-grade open source projects: IaC, Kubernetes, GitOps and AI orchestration.**

[Website](https://lracloudops.com/) · [Services](https://lracloudops.com/services/) · [Projects](https://lracloudops.com/projects/) · [Security](https://lracloudops.com/security/)

LRA CloudOps is a bilingual professional website and engineering portfolio built with Astro and deployed on Cloudflare Pages. It presents Platform Engineering services, technical case studies, open-source projects, pricing, security information, and contact/audit request flows.

## Features

- English site at the root (/) and Spanish site under /es/.
- Project information enriched with GitHub API data at build time.
- Contact and audit request flows connected to Cloudflare Workers and GitHub Actions.
- Smart Scan workflow for repository security reviews and AI-generated reports.
- DevOps advisor integration through a Cloudflare Worker.
- Automated build, tests, accessibility checks, Lighthouse CI, and dependency updates.

## Technology Stack

- **Framework:** Astro 6, TypeScript
- **Styling:** Tailwind CSS 4 and the LRA CloudOps design system
- **Animation:** Lenis and GSAP
- **Hosting and edge services:** Cloudflare Pages and Cloudflare Workers
- **CI/CD:** GitHub Actions
- **Testing:** Playwright, axe-core, Lighthouse CI
- **Project data:** GitHub API

## Project Structure

There are currently **39 Astro page files** under src/pages/ in the repository (English routes at the root and Spanish routes under /es/). The generated HTML count can vary by build configuration and is not asserted here.

~~~text
.
├── .github/
│   └── workflows/           # Build, Smart Scan, monitoring, and automation
├── docs/                     # Architecture, CI/CD, setup, monitoring, audits
├── functions/                # Cloudflare Pages Functions configuration
├── public/
│   ├── .well-known/
│   │   └── security.txt      # RFC 9116 vulnerability disclosure contact
│   ├── js/                   # 11 externalized JavaScript files
│   ├── _headers              # HTTP security headers and CSP
│   ├── _redirects            # Redirect rules
│   └── site.webmanifest      # Web app manifest (when present)
├── scripts/                  # Repository maintenance and automation scripts
├── src/
│   ├── components/
│   │   ├── layout/           # Header.astro, Footer.astro
│   │   ├── ui/               # Badge, Button, Card, DiagramIcon,
│   │   │                     # FormField, Logo, Section, SectionHeader
│   │   └── ChatWidget.astro  # DevOps advisor widget
│   ├── data/
│   │   └── industry-diagrams.ts
│   ├── layouts/
│   │   └── Layout.astro      # Shared base layout
│   ├── lib/
│   │   ├── github.ts         # Build-time GitHub API data
│   │   ├── tagColors.ts
│   │   └── worker-config.ts
│   ├── pages/                # 39 Astro page files (EN root + ES /es/)
│   ├── scripts/
│   │   └── animations.ts     # Lenis + GSAP
│   └── styles/
│       └── global.css        # Global styles and design system
├── tests/                    # Playwright tests
├── workers/
│   └── webhook/              # Cloudflare Worker — Smart Scan trigger
├── astro.config.mjs
├── package.json
├── SECURITY.md
└── wrangler.jsonc
~~~

## Local Development

**Requirements:** Node.js >=22.12.0 and npm.

~~~bash
npm ci
npm run dev
~~~

Create a local .env file only when needed, using .env.example as a reference. Never commit real credentials or tokens.

### Common commands

~~~bash
npm run dev       # Start the local development server
npm run build     # Build the production site
npm run preview   # Preview the production build
npm test          # Run Playwright tests
npm run lint      # Run ESLint
npm run lhci      # Run Lighthouse CI
~~~

## Environment Variables

Set production secrets in the appropriate GitHub Actions or Cloudflare environment. The values below are names and purposes only; never commit real values.

| Variable | Purpose |
| --- | --- |
| GITHUB_TOKEN | Raises GitHub API rate limit from 60 to 5,000 requests/hour with the required read-only scope; also used by the webhook/Smart Scan flow in the relevant runtime. |
| ANTHROPIC_API_KEY | Smart Scan AI report generation and supported AI advisor integration. |
| RESEND_API_KEY | Smart Scan email delivery and optional internal audit-request notifications. |
| PUBLIC_GA_ID | Google Analytics 4 measurement ID. Public browser-side identifier, not a secret. |
| PUBLIC_CF_BEACON | Cloudflare Web Analytics beacon token. Public browser-side identifier, not a secret. |

See .env.example, docs/cloudflare-setup.md, docs/webhook-setup.md, and docs/ci-cd.md for configuration details.

## Security

- A Content Security Policy is configured in public/_headers; scripts are externalized under public/js/, and script-src does not use unsafe-inline.
- **CSP nuance:** the current style-src directive still permits 'unsafe-inline'; inline styles should be removed or nonce/hash-based controls considered before claiming a fully strict CSP.
- HSTS is configured for two years with includeSubDomains and preload.
- X-Frame-Options: DENY helps prevent clickjacking.
- X-Content-Type-Options: nosniff and a restrictive Permissions-Policy are configured.
- Security contact: /.well-known/security.txt (RFC 9116).
- Vulnerability disclosure page: [Security](https://lracloudops.com/security/).
- Full policy and reporting instructions: [SECURITY.md](./SECURITY.md).

Do not put API keys, access tokens, private keys, or production credentials in the repository. See SECURITY.md for responsible disclosure instructions.

## Architecture

- **Build time:** src/lib/github.ts reads public project data from the GitHub API.
- **Runtime advisor:** the ChatWidget communicates with a Cloudflare Worker that connects to the configured AI provider.
- **Contact and Smart Scan:** the contact flow can call the Cloudflare webhook Worker, which dispatches the Smart Scan GitHub Actions workflow. The workflow uses the related lra-ai-platform project and its scanning/reporting tools.
- **Internationalization:** English routes are at the root; Spanish routes use /es/. Astro sitemap integration is configured for both locales.

Additional details are available in [docs/architecture.md](./docs/architecture.md).

## Related Projects

The site currently presents these technical projects:

- [LRA AI Platform](https://github.com/lra-cloud-ops/lra-ai-platform)
- [AWS DevOps Agent](https://github.com/lra-cloud-ops/aws-devops-agent)
- [AWS Terraform DevOps](https://github.com/lra-cloud-ops/aws-terraform-devops)
- [Kubernetes On-Premise](https://github.com/lra-cloud-ops/k8s-on-premise)

## About

LRA CloudOps provides Platform Engineering and DevOps consulting content alongside production-grade open-source projects focused on infrastructure as code, Kubernetes, GitOps, and AI orchestration.

## License

Unless a license file or individual project states otherwise, contact the maintainers before redistributing site content or assuming permissions for code and assets.
