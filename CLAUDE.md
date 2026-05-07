# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Astro 6 + Tailwind CSS 4 portfolio/marketing site for **LRA Cloud Operations** — a DevOps/cloud consulting brand. All content is in Spanish. Target domain: `https://lracloudops.com`.

## Commands

```bash
npm run dev       # Dev server at http://localhost:4321
npm run build     # Production build → ./dist/
npm run preview   # Preview the production build locally
```

No lint or test scripts are configured.

## Architecture

**Rendering model:** Astro static site generation. Every page in `src/pages/` maps to a URL. There is no SSR or API layer.

**Styling:** Tailwind CSS is loaded as a **Vite plugin** (`@tailwindcss/vite`) configured in `astro.config.mjs` — not the `@astrojs/tailwind` integration. Tailwind is imported once in `src/styles/global.css` and that file is imported at the top of the base layout.

**Layout pattern:** `src/layouts/Layout.astro` is the single base layout. It accepts two required props — `titulo` (page title) and `descripcion` (meta description) — and renders the sticky header, `<slot />`, and footer. Every page wraps its content in this layout.

**All routes implemented:** `/`, `/servicios`, `/proyectos`, `/blog`, `/contacto`, `/blog/[slug]`, `/projects/[slug]`.

**Design system:** Blue palette — `#0A2540` (primary dark), `#1E6FFF` (accent blue), `#EEF4FF` (soft background), `#64748b` (secondary text). Never use teal/emerald/cyan. Cards: `border-radius: 16px`, white bg, shadow. Hero sections use `#0A2540` dark with dot-grid pattern and radial glow. Inter font (Google Fonts) for headings, JetBrains Mono for code/terminal.

**Content collections:** `src/content/blog/` for blog posts, `src/content/projects/` for project case studies. Both use `loader: glob(...)` from Astro Content Layer API.

**Project case study pages:** Individual pages at `/projects/[slug]` generated from `src/content/projects/*.md`. Schema includes: titulo, descripcion, fecha, categoria, madurez, stack, cicd, github, featured, metricas, highlights, arquitectura.

**Components pattern:** No `src/components/` directory — all reusable patterns are inline in pages. Section headers follow: small blue label → large h2 → gray subtitle.
