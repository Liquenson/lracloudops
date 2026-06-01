---
titulo: "LRA Cloud Operations Platform"
descripcion: "Static marketing and engineering platform for the LRA Cloud Operations brand. Built with Astro 6 and Tailwind CSS 4, deployed globally on Cloudflare Pages with automated CI/CD, structured data, Open Graph and Content Collections API."
fecha: 2026-05-01
categoria: "Web Platform"
madurez: "Production"
stack: ["Astro 6.2.1", "Tailwind CSS 4", "TypeScript", "Cloudflare Pages", "Web3Forms", "Content Collections"]
cicd: true
github: "https://github.com/Liquenson/lracloudops"
featured: false
iconPath: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
draft: false
metricas:
  - { label: "Pages", value: "15+ routes" }
  - { label: "Build time", value: "< 30s" }
  - { label: "Deploy", value: "Global edge" }
  - { label: "Backend", value: "0 servers" }
highlights:
  - "Static site generation with Astro: zero framework JavaScript shipped to the client by default"
  - "Tailwind CSS 4 via Vite plugin: incremental compilation without manual purge configuration"
  - "Content Collections API with Zod schema: blog posts and project case studies validated at build time"
  - "Cloudflare Pages: automatic deployment on push to main, CDN across 300+ edge locations"
  - "Web3Forms for contact form: no backend, no Lambda, built-in spam protection"
  - "Consistent design system without UI frameworks: #0A2540 / #1E6FFF / #EEF4FF palette"
  - "Organization and Article structured data (JSON-LD) for SEO authority signals"
  - "Open Graph and Twitter Card meta tags on every page"
arquitectura:
  - { nombre: "Astro 6 SSG", descripcion: "Generates static HTML at build time: no server runtime, maximum initial performance" }
  - { nombre: "Content Collections", descripcion: "Blog posts and project case studies in Markdown with Zod schema validated before deployment" }
  - { nombre: "Tailwind CSS 4 + Vite", descripcion: "Utility-first CSS loaded as Vite plugin — no tailwind.config.js required" }
  - { nombre: "Cloudflare Pages", descripcion: "Global edge hosting with integrated CI/CD: push → build → deploy in under 60 seconds" }
  - { nombre: "Web3Forms", descripcion: "Serverless contact form with public API key and built-in anti-spam protection" }
---

## Platform overview

The engineering and marketing platform for LRA Cloud Operations. Built with Astro 6 static site generation and Tailwind CSS 4, deployed globally on Cloudflare Pages. The platform demonstrates the same principles it describes — minimal server footprint, automated deployment and infrastructure defined as code.

15+ routes covering solutions, case studies, service pages, blog and contact. Zero servers to maintain. Zero runtime to manage.

## Technical decisions

**Astro over JavaScript frameworks** — a marketing and engineering documentation site has no need for client-side hydration, dynamic routing or a virtual DOM. Astro generates HTML at build time. The client receives plain HTML with no framework runtime. First Contentful Paint in tenths of a second. Lighthouse scores starting at 90+ without additional optimization.

**Content Collections with build-time validation** — blog posts and project case studies are Markdown files with Zod-validated frontmatter. Adding a required field to the schema means all existing files must be updated or the build fails. Invalid metadata cannot reach production. The schema is the contract between content authors and the rendering layer.

**Tailwind CSS 4 integration** — Tailwind CSS 4 changed the integration model significantly. Instead of `@astrojs/tailwind`, version 4 uses `@tailwindcss/vite` as a Vite plugin in `astro.config.mjs`. No `tailwind.config.js` file exists. Custom design tokens are defined as CSS variables in `global.css`. Documentation from Tailwind v3 does not apply.

**Design system without UI component libraries** — the entire design system is CSS variables and Tailwind utility classes. No Shadcn, no Material UI, no component library dependency to maintain or upgrade. The color palette is intentionally limited to three semantic values: `#0A2540` for dark backgrounds and primary text, `#1E6FFF` for accents and interactive elements, `#EEF4FF` for soft backgrounds and cards.

**Cloudflare Pages deployment** — Cloudflare detects a push to `main`, runs `npm run build`, and distributes artifacts to 300+ edge locations. Typical time from push to globally available is under 60 seconds. TLS, CDN caching and performance optimization are handled by the platform — no configuration required.

**Contact form without backend** — Web3Forms provides a contact form API using a public API key. No Lambda function, no backend server, no form processing infrastructure. Spam protection is built into the service.

## Key constraint

Astro Content Collections validates the schema at build time, not at runtime. Adding a new required field to the project case study schema requires updating all existing project markdown files simultaneously — or marking the field optional with `.optional()` to maintain backward compatibility. This constraint means content schema changes are coordinated across all content files, which is a property, not a bug: it prevents partial migrations that deploy with missing data.
