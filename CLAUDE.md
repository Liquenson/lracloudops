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

**Planned routes not yet implemented:** `/servicios`, `/blog`, `/contacto` are linked from the nav and hero but have no corresponding page files yet.

**Design system:** Minimal teal/gray palette. Service cards follow a consistent pattern: teal icon container, `h3` title, `p` description, flex-wrapped tag pills. Experience entries use a vertical accent bar (`w-1` div) + content column layout.
