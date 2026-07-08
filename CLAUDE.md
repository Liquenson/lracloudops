# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Astro 6 + Tailwind CSS 4 enterprise platform site for **LRA Cloud Operations** — a cloud infrastructure and platform engineering consultancy. Primary language: English. Spanish version at `/es`. Target domain: `https://lracloudops.com`.

## Commands

```bash
npm run dev       # Dev server at http://localhost:4321
npm run build     # Production build → ./dist/
npm run preview   # Preview the production build locally
```

No lint scripts. CI via `.github/workflows/build.yml` (npm ci + astro check + astro build).

## Architecture

**Rendering model:** Astro static site generation. Every page in `src/pages/` maps to a URL. No SSR or API layer.

**i18n:** Native Astro i18n configured in `astro.config.mjs`. English is the default locale (no prefix). Spanish pages live under `src/pages/es/`. Translation strings in `src/i18n/ui.ts` (79 keys). Helper functions in `src/i18n/index.ts`.

**Styling:** Tailwind CSS loaded as a Vite plugin (`@tailwindcss/vite`). Tailwind is imported once in `src/styles/global.css` which is imported at the top of the base layout.

**Layout:** `src/layouts/Layout.astro` is the single base layout. Props: `titulo` (required), `descripcion` (required), `schema` (optional LD+JSON), `ogType` (optional, default `'website'`), `ogImage` (optional). Renders sticky header, language switcher (EN | ES), `<slot />`, and footer.

**English routes (canonical):**
- `/` — Home
- `/services` — Solutions overview
- `/projects` — Case studies & project grid
- `/about` — Team
- `/contact` — Contact form (English)
- `/blog` — Blog listing
- `/blog/[slug]` — Blog post
- `/projects/[slug]` — Project detail
- `/cloud-infrastructure`, `/platform-engineering`, `/devops-automation`, `/observability` — Solution detail pages

**Spanish routes (`/es/`):**
- `/es` — Home ES
- `/es/servicios` — Solutions ES
- `/es/proyectos` — Projects ES
- `/es/nosotros` — About ES
- `/es/contacto` — Contact ES
- `/es/blog` — Blog listing ES

**Redirects:** `public/_redirects` handles old Spanish URL → new English URL redirects (e.g., `/servicios` → `/services`).

**Components:** `src/components/SolutionLayout.astro` — parametrized template used by all 4 solution detail pages. Future components belong here.

**Design system:** Blue palette — `#0A2540` (dark navy), `#1E6FFF` (accent), `#2563EB` (CSS variable primary), `#EEF4FF` (soft background), `#64748b` (secondary text). Never use teal/emerald/cyan. Cards: `border-radius: 16px`, white bg, shadow. Fonts: Inter (headings/body), JetBrains Mono (code/terminal) — Google Fonts.

## Design System — Current (v4)

**Color palette (Google Cloud inspired):**
- Primary: `#1A73E8` (Google Blue)
- Text: `#202124`
- Secondary text: `#5F6368`
- Border: `#DADCE0`
- Background: `#F8F9FA`
- White: `#FFFFFF`
- Success: `#137333`
- Warning: `#F29900`
- Error: `#C5221F`
- Dark (footer): `#202124`

**Typography:** Red Hat Display + Red Hat Text + Red Hat Mono
**Animations:** Lenis 1.3.25 + GSAP 3.15.0 + ScrollTrigger

**Content collections:** `src/content/blog/` (blog posts), `src/content/projects/` (case studies). Both use `loader: glob(...)`.

**Email:** All references use `info@lracloudops.com`. Never use the personal Gmail address.

**Security:** `public/_headers` configures HTTP security headers (CSP, X-Frame-Options, HSTS, Permissions-Policy) for Cloudflare Pages.

## Portfolio state (updated July 2, 2026)

### Active projects in `src/content/projects/`
- None. `src/content/projects/` is empty — `/projects` and `/es/proyectos` render a "Coming Soon" placeholder linking to `github.com/lra-cloud-ops`. Real repos (k8s-on-premise, gitops-stack, aws-devops-agent, aws-terraform-devops, k8s-devops-platform, linux-fleet-manager) are still listed on `/open-source` with direct GitHub links, independent of this collection.

### Schema field names (Zod)
The content collection schema uses different names than the intuitive ones:
- `title` → `titulo`
- `description` → `descripcion`
- `status` → `madurez` (enum: Production | In Development | Reference | Starter)
- `tags` → `stack` (string array)
- `metrics` → `metricas` (array of `{ label, value }`)
- `fecha` is required (YYYY-MM-DD format)

### GitHub organization
- All portfolio projects live at `github.com/lra-cloud-ops`
- Personal repos (`github.com/Liquenson`) are NOT linked from the portfolio

### To add a new project
1. Create repo at `github.com/lra-cloud-ops/<name>`
2. Create `src/content/projects/<slug>.md` with real data only
3. Set `featured: false` while In Development, `featured: true` when Production
4. Set `draft: false` to make it visible on the site
5. PR → CI → merge → auto-deploy to Cloudflare Pages
