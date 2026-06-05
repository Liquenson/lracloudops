# Architecture — LRA Cloud Operations

## Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Astro | 6.2.1 |
| Styling | Tailwind CSS + Vite plugin | 4.x |
| Runtime | Node.js | ≥ 22.12.0 |
| Deploy | Cloudflare Pages | — |
| CDN / Edge | Cloudflare | — |
| Typography | @tailwindcss/typography | 0.5.x |
| Sitemap | @astrojs/sitemap | 3.x |

## Page Structure

All files in `src/pages/` map directly to URL routes (static site generation — no SSR).

```
src/pages/
  index.astro                     → /
  services.astro                  → /services
  projects.astro                  → /projects
  about.astro                     → /about
  contact.astro                   → /contact
  assessment.astro                → /assessment
  assessments.astro               → /assessments
  blog/index.astro                → /blog
  blog/[slug].astro               → /blog/:slug
  projects/[slug].astro           → /projects/:slug
  cloud-infrastructure.astro      → /cloud-infrastructure
  platform-engineering.astro      → /platform-engineering
  devops-automation.astro         → /devops-automation
  observability.astro             → /observability
  pricing.astro                   → /pricing
  resources.astro                 → /resources
  security.astro                  → /security
  why-lra.astro                   → /why-lra
  certifications.astro            → /certifications
  kubernetes-platforms.astro      → /kubernetes-platforms
  kubernetes-readiness.astro      → /kubernetes-readiness
  cloud-readiness.astro           → /cloud-readiness
  architectures/                  → /architectures/*
  solutions/                      → /solutions/*
  industries/                     → /industries/*
  docs/                           → /docs/*
  es/                             → /es/* (Spanish locale)
  404.astro                       → /404
```

## i18n

- Default locale: `en` (no URL prefix)
- Spanish locale: `es` (prefix `/es`)
- Translation strings: `src/i18n/ui.ts` (79 keys)
- Helper functions: `src/i18n/index.ts`
- Old Spanish URL redirects: `public/_redirects`

## Layout System

`src/layouts/Layout.astro` is the single base layout.

Props:
- `titulo` (required) — `<title>` and OG title
- `descripcion` (required) — meta description and OG description
- `schema` (optional) — LD+JSON structured data
- `ogType` (optional, default `'website'`) — OG type
- `ogImage` (optional) — OG image URL

Renders: sticky header + language switcher (EN | ES) + `<slot />` + footer + AI chat widget (EN only).

## Components

- `src/layouts/Layout.astro` — base layout
- `src/components/SolutionLayout.astro` — parametrized template for all 4 solution detail pages
- `src/components/AgentChat.astro` — floating AI DevOps Advisor chat widget (EN pages only, powered by Cloudflare Worker, toggle button `#lra-chat-toggle`)

## Content Collections

- `src/content/blog/` — blog posts (glob loader, MDX/Markdown)
- `src/content/projects/` — case studies (glob loader, MDX/Markdown)

## Design System

| Token | Value | Usage |
|---|---|---|
| Primary dark | `#0A2540` | Backgrounds, headings |
| Accent blue | `#1E6FFF` | CTAs, highlights |
| CSS var primary | `#2563EB` | Interactive elements |
| Soft background | `#EEF4FF` | Section backgrounds |
| Secondary text | `#64748b` | Body text, captions |

Fonts: Inter (headings/body), JetBrains Mono (code/terminal) — loaded via Google Fonts.  
Cards: `border-radius: 16px`, white background, box shadow.  
**Never** use teal / emerald / cyan.

## Security Headers

`public/_headers` sets HTTP security headers for Cloudflare Pages:
- Content-Security-Policy (CSP)
- X-Frame-Options
- Strict-Transport-Security (HSTS)
- Permissions-Policy

## Environment Variables

No runtime environment variables are required for the static build. The AI chat widget communicates with a Cloudflare Worker at runtime (client-side); the Worker URL is hardcoded in `AgentChat.astro`.

## Deploy Flow

1. Push to `main` branch
2. GitHub Actions runs `build.yml` (type check + build)
3. Cloudflare Pages detects the push via direct GitHub integration
4. Cloudflare Pages builds and deploys automatically to `https://lracloudops.com`

No `wrangler deploy` is needed — deployment is fully managed by Cloudflare Pages' GitHub integration.
