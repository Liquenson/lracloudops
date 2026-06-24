# Informe Técnico — lracloudops
**Fecha:** 2026-06-24 | **Rama activa:** `feat/reorder-homepage-sections` | **Versión del paquete:** 4.0.0

---

## 1. RESUMEN EJECUTIVO

### Propósito y audiencia objetivo
**LRA Cloud Ops** (`https://lracloudops.com`) es el sitio de marketing y portafolio profesional de una consultoría especializada en infraestructura cloud, Kubernetes, DevOps y platform engineering. La audiencia objetivo son empresas medianas y grandes (Healthcare, Fintech, SaaS) que buscan servicios de automatización DevOps, modernización AWS y adopción de Kubernetes. El sitio actúa como canal de generación de leads (formulario de contacto, Cal.com scheduling, newsletter, AI chat advisor) y de credibilidad (certificaciones, proyectos, casos de uso, open source).

### Stack tecnológico principal

| Categoría | Tecnología | Versión |
|---|---|---|
| Framework | Astro | 6.4.6 |
| CSS | Tailwind CSS (Vite plugin) | 4.3.1 |
| Runtime | Node.js | ≥ 22.12.0 |
| Testing | Playwright | 1.60.0 |
| Tipografía | Inter + JetBrains Mono | Fontsource |
| Deploy | Cloudflare Pages | vía integración GitHub |
| Backend AI | Cloudflare Worker | externo |
| Analytics | Google Analytics + CF Analytics | — |

### Estado actual del proyecto
**Producción activa.** El sitio está desplegado y recibe tráfico real en `lracloudops.com`. La rama `main` se despliega automáticamente en Cloudflare Pages. El proyecto se encuentra en fase de **mejora continua**: la actividad reciente apunta a refinamiento del homepage (reorder de secciones, diagramas de flujo por proyecto). No hay indicadores de deuda de seguridad crítica ni build errors reportados.

---

## 2. ARQUITECTURA Y ESTRUCTURA

### Árbol de directorios (3 niveles, sin node_modules / .git / dist)

```
lracloudops/
├── .github/
│   ├── dependabot.yml           # Auto-updates semanales npm
│   └── workflows/
│       └── build.yml            # Pipeline CI único
├── docs/                        # Documentación técnica interna
│   ├── architecture.md
│   ├── architecture-report.md
│   ├── ci-cd.md
│   ├── monitoring.md
│   ├── spanish-audit-2026-06-14.md
│   └── sync-report-2026-06-11.md
├── public/
│   ├── _headers                 # Security headers para Cloudflare Pages
│   ├── _redirects               # Reglas 301 para URLs legadas
│   ├── images/                  # Fotos de equipo (darwin, kelvin, liquenson, wesley)
│   ├── robots.txt
│   ├── site.webmanifest         # PWA manifest
│   ├── favicon.* (múltiples resoluciones)
│   ├── logo*.svg
│   └── og-image.png             # 1200×630 Open Graph image
├── scripts/
│   └── generate-og.mjs          # Script para regenerar OG image
├── src/
│   ├── components/
│   │   ├── AgentChat.astro      # Widget de AI chat (Cloudflare Worker)
│   │   ├── ArchitectureDiagram.astro
│   │   ├── FlowDiagram.astro    # Diagrama SVG de pasos por proyecto
│   │   ├── NewsletterCTA.astro
│   │   ├── ProjectCard.astro
│   │   ├── ProjectsGrid.astro
│   │   ├── SolutionLayout.astro # Template reutilizable para páginas de servicio
│   │   └── TechIcon.astro       # Iconos via simple-icons
│   ├── content/
│   │   ├── blog/                # 10 artículos EN (Markdown)
│   │   ├── es/blog/             # 10 artículos ES (Markdown)
│   │   └── projects/            # 6 case studies (Markdown + frontmatter Zod)
│   ├── i18n/
│   │   ├── index.ts             # getLangFromUrl, getAlternateUrl, getHreflangTags
│   │   ├── locales/             # JSON por idioma (es, en, de, fr, it, pt-br, ja, ko, zh-cn)
│   │   └── ui.ts                # Claves de traducción estáticas
│   ├── layouts/
│   │   └── Layout.astro         # Layout base único (2 537 líneas)
│   ├── pages/
│   │   ├── index.astro          # Homepage ES (root, sin prefijo)
│   │   ├── [23 páginas ES]      # Rutas en español por defecto
│   │   ├── en/                  # 45 páginas EN (/en/*)
│   │   ├── de/ fr/ it/ pt-br/   # 10 páginas cada uno
│   │   ├── ja/ ko/ zh-cn/       # 10 páginas cada uno
│   │   └── api/                 # Endpoints de API (no inventariados)
│   ├── content.config.ts        # Zod schemas: blog, esBlog, projects
│   └── styles/
│       └── global.css           # @import tailwindcss (entry point CSS)
├── tests/
│   └── basic.spec.ts            # 10 smoke tests con Playwright
├── astro.config.mjs
├── package.json
├── playwright.config.ts
├── .lighthouserc.json
└── .prettierrc
```

### Descripción de directorios principales

| Directorio | Función |
|---|---|
| `src/pages/` | Rutas SSG. Cada `.astro` = una URL. 158 archivos en total. |
| `src/components/` | Componentes reutilizables (8 archivos). |
| `src/layouts/` | Layout base único con navbar, language switcher y footer. |
| `src/content/` | Blog (EN/ES) y proyectos en Markdown con frontmatter tipado (Zod). |
| `src/i18n/` | Sistema de internacionalización: funciones helper + locales JSON. |
| `public/` | Assets estáticos servidos directamente: favicons, imágenes, manifests, reglas Cloudflare. |
| `.github/workflows/` | Un único workflow CI (`build.yml`). Deploy delegado a Cloudflare Pages. |
| `tests/` | Un único archivo de tests E2E (Playwright). |
| `scripts/` | Script utilitario para regenerar la OG image. |
| `docs/` | Documentación técnica interna (auditorías, arquitectura). |

### Patrón arquitectónico
**SSG puro (Static Site Generation).** No hay SSR, API layer propio ni base de datos. Astro genera HTML estático en build time. La única pieza dinámica es el widget de AI chat (`AgentChat.astro`), que delega al Worker externo `lracloudops-agent.liquenson-cloud.workers.dev`. Los formularios usan Web3Forms (servicio externo).

---

## 3. TECNOLOGÍAS Y DEPENDENCIAS

### Framework principal
- **Astro 6.4.6** — SSG con i18n nativo, content collections, integración Vite.

### Dependencias de producción

| Paquete | Versión | Propósito |
|---|---|---|
| `astro` | ^6.4.6 | Framework SSG |
| `tailwindcss` | ^4.3.1 | Framework CSS utilitario |
| `@tailwindcss/vite` | ^4.3.1 | Plugin Vite para Tailwind v4 |
| `@tailwindcss/typography` | ^0.5.20 | Plugin para renderizar Markdown con estilos prose |
| `@astrojs/sitemap` | ^3.7.3 | Generación automática de sitemap.xml |
| `@fontsource-variable/inter` | ^5.2.8 | Font Inter (variable) |
| `@fontsource/jetbrains-mono` | ^5.2.8 | Font JetBrains Mono |
| `wrangler` | ^4.100.0 | Cloudflare CLI (usado para `generate-types`) |

### Dependencias de desarrollo

| Paquete | Versión | Propósito |
|---|---|---|
| `@playwright/test` | ^1.60.0 | Testing E2E |
| `prettier` | ^3.8.4 | Formateador de código |
| `prettier-plugin-astro` | ^0.14.1 | Soporte Astro en Prettier |
| `simple-icons` | ^16.23.0 | Iconos SVG de marcas tecnológicas (TechIcon.astro) |

### Override de Vite
```json
"overrides": { "vite": "^7" }
```
Se fuerza Vite 7 para compatibilidad con Tailwind CSS v4.

### Scripts npm disponibles

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `astro dev` | Servidor de desarrollo en `http://localhost:4321` |
| `build` | `astro build` | Build de producción → `./dist/` |
| `preview` | `astro preview` | Preview del build local |
| `astro` | `astro` | CLI de Astro directo |
| `generate-og` | `node scripts/generate-og.mjs` | Regenera la OG image |
| `generate-types` | `wrangler types` | Genera tipos TypeScript para Cloudflare |
| `test` | `playwright test` | Ejecuta tests E2E headless |
| `test:ui` | `playwright test --ui` | Abre Playwright UI interactivo |

---

## 4. CONFIGURACIÓN Y ENTORNOS

### Variables de entorno requeridas

| Variable | Archivo | Propósito |
|---|---|---|
| `PUBLIC_RESEND_API_KEY` | `.env.local` | API key de Resend para envío de emails |

> **Nota:** No se encontró `.env.example`. El único `.env.local` contiene una clave API activa y está en `.gitignore`. Se recomienda crear `.env.example` con claves ficticias para onboarding.

### Configuración de build (`astro.config.mjs`)

```js
site: 'https://lracloudops.com'
i18n:
  defaultLocale: 'es'   // sin prefijo en URL
  locales: ['es', 'en', 'de', 'fr', 'it', 'pt-br', 'ja', 'ko', 'zh-cn']
  routing: { prefixDefaultLocale: false }
  fallback: { 'en': 'es', 'de': 'es', ... }   // todos fallback a ES
vite: { plugins: [tailwindcss()] }
integrations: [sitemap(...)]  // con prioridades customizadas y hreflang
```

La prioridad del sitemap sigue este esquema:
- `/` → 1.0
- `/servicios`, `/pricing`, `/assessment` → 0.9
- `/nosotros`, `/contacto`, blog, proyectos → 0.8
- `/blog/*`, `/projects/*`, `/solutions/*` → 0.7
- `/security`, `/privacy`, `/terms` → 0.5

### Configuración de deployment (Cloudflare Pages)

- Deploy **automático** desde GitHub: cada merge a `main` lanza un deploy en Cloudflare Pages.
- No se usa `wrangler deploy` en CI; la integración es directa vía GitHub App.
- `public/_headers` configura headers de seguridad HTTP.
- `public/_redirects` gestiona 301 permanentes para URLs legadas.
- Cache para imágenes: `Cache-Control: public, max-age=31536000, immutable`.

### Configuración Lighthouse CI (`.lighthouserc.json`)

```json
collect:  staticDistDir: "./dist"
          urls: ["/", "/proyectos", "/contacto"]
assert:   performance   ≥ 0.75  (warn)
          accessibility ≥ 0.85  (warn)
          seo           ≥ 0.85  (warn)
upload:   target: "temporary-public-storage"
```

Modo warn-only: el pipeline no falla por Lighthouse.

---

## 5. COMPONENTES Y PÁGINAS

### Páginas / rutas existentes

#### Locale ES (raíz, sin prefijo) — 23 páginas
| Ruta | Descripción |
|---|---|
| `/` | Homepage ES |
| `/servicios` | Soluciones overview |
| `/proyectos` | Casos de uso |
| `/nosotros` | Equipo |
| `/contacto` | Formulario de contacto |
| `/blog` | Listado de blog |
| `/blog/[slug]` | Artículo individual |
| `/certifications` | Certificaciones |
| `/cloud-infrastructure` | Servicio: Infraestructura Cloud |
| `/kubernetes-platforms` | Servicio: Kubernetes |
| `/devops-automation` | Servicio: Automatización DevOps |
| `/platform-engineering` | Servicio: Ingeniería de Plataforma |
| `/observability` | Servicio: Observabilidad |
| `/solutions/aws-modernization` | Solución: Modernización AWS |
| `/solutions/kubernetes-adoption` | Solución: Adopción K8s |
| `/solutions/cicd-transformation` | Solución: CI/CD |
| `/solutions/gitops` | Solución: GitOps |
| `/industries/healthcare`, `/fintech`, `/saas` | Páginas por industria |
| `/pricing` | Precios |
| `/resources` | Guías y recursos |
| `/open-source` | Proyectos open source |
| `/why-lra` | Diferenciación |
| `/security`, `/privacy`, `/terms` | Legales |
| `/assessment`, `/cloud-readiness`, `/kubernetes-readiness` | Herramientas de evaluación |
| `/blog`, `/pricing`, `/certifications`, `/metodologia` | (adicionales) |

#### Locale EN (`/en/`) — 45 páginas
Equivalente completo de ES, más:
- `/en/architectures/` (6 páginas: index, aws-landing-zone, eks-production-platform, gitops-platform, observability-platform, platform-engineering-blueprint)
- `/en/docs/` (4 páginas: index, gitops-standards, kubernetes-production, terraform-standards)
- `/en/assessments` (página adicional)

#### Locales parciales (DE, FR, IT, PT-BR, JA, KO, ZH-CN) — 10 páginas cada uno
- Index + 5 servicios + 4 soluciones
- Sin blog, sin projects, sin about, sin contact propios (fallback a ES)

### Componentes principales

| Componente | Responsabilidad |
|---|---|
| `Layout.astro` (2 537 líneas) | Layout base: `<head>` completo con SEO/OG/JSON-LD, navbar sticky con 5 dropdowns, language switcher, mobile drawer accordion, announcement bar, footer |
| `AgentChat.astro` | Widget flotante AI (Cloudflare Worker backend). Sanitización XSS manual, historial de 20 mensajes, CTA Cal.com tras 3 respuestas |
| `SolutionLayout.astro` | Template parametrizado para las 4 páginas de servicio detail |
| `ProjectCard.astro` | Tarjeta de proyecto con FlowDiagram mini integrado |
| `ProjectsGrid.astro` | Grid de proyectos con filtrado |
| `FlowDiagram.astro` | Diagrama SVG de pasos/fases de un proyecto |
| `ArchitectureDiagram.astro` | Diagramas de arquitectura para Architecture Center |
| `TechIcon.astro` | Icono SVG de marca via `simple-icons`, con fallback a Heroicons |
| `NewsletterCTA.astro` | Formulario de newsletter reutilizable |

### Layout único
`src/layouts/Layout.astro` — props: `titulo` (req), `descripcion` (req), `keywords` (opt), `schema` (opt JSON-LD), `ogType` (opt, default `'website'`), `ogImage` (opt).

### Integraciones externas

| Servicio | Propósito |
|---|---|
| **Google Analytics** (G-JES91JND3F) | Métricas de tráfico |
| **Cloudflare Web Analytics** (beacon) | Analytics sin cookies |
| **Web3Forms** (api.web3forms.com) | Submissions de formularios de contacto |
| **Cloudflare Turnstile** (challenges.cloudflare.com) | CAPTCHA sin fricción |
| **Cloudflare Worker** (lracloudops-agent.liquenson-cloud.workers.dev) | Backend del chat AI |
| **Cal.com** (cal.com/ruben-alexis-h6qkjk/30min) | Scheduling de consultas |
| **Resend** | Emails (via `PUBLIC_RESEND_API_KEY`) |
| **Google Fonts** | No — fonts cargadas via Fontsource (npm, self-hosted) |

---

## 6. CI/CD Y AUTOMATIZACIÓN

### Workflow GitHub Actions: `build.yml`

**Triggers:** push a `main`, `feat/**`, `fix/**`, `chore/**`; PRs a `main`.

**Concurrency:** cancela runs en progreso del mismo grupo (`workflow + ref`). Timeout: 10 minutos.

**Pipeline:**

```
Checkout
  → Node 22 (cache npm)
    → npm ci
      → npm audit --audit-level=high  (continue-on-error: true)
        → astro check  (TypeScript/Astro type checking)
          → npm run build
            → Verify dist exists
              → Upload artifact (solo en main, 30 días)
                → Lighthouse CI (warn-only)
```

**Deploy:** Cloudflare Pages via integración directa GitHub — no interviene el workflow. Cada merge a `main` dispara deploy automático.

**Formato (Prettier):** el step de format check está **comentado** en CI. Se debe ejecutar manualmente antes de hacer PR.

### Dependabot
- Frecuencia: semanal
- Máximo 5 PRs abiertos simultáneos
- Ignora actualizaciones major (`semver-major`)
- Label: `dependencies`

### Tests
- Framework: **Playwright** (`playwright.config.ts` → `testDir: ./tests`, baseURL: `http://localhost:4321`)
- Archivo único: `tests/basic.spec.ts`
- **10 smoke tests:**
  1. Homepage carga y tiene título con "LRA"
  2. Navbar con al menos 3 links
  3. Cambio de idioma EN→ES
  4. `/contact` tiene formulario
  5. `/assessment` carga con heading
  6. `/projects` carga con heading
  7. Chat AI toggle visible en homepage
  8. `/open-source` carga con `<h1>`
  9. `/resources` tiene filtros (≥3 botones)
  10. `/blog` tiene newsletter form
- No hay tests de contenido específico, renders multilingüe, ni cobertura de rutas `/en/`.

---

## 7. SEO Y RENDIMIENTO

### Meta tags / SEO
Gestionados centralmente en `Layout.astro`:

- `<title>`: `{titulo} | LRA Cloud Ops`
- `<meta name="description">`, `<meta name="keywords">`
- `<link rel="canonical">` absoluta con dominio
- **hreflang** para los 9 locales + `x-default` → `/`
- **Robots:** `index, follow, max-image-preview:large` por defecto; `noindex, nofollow` para páginas de locales menores que solo tienen fallback (soluciones/industrias en DE/FR/etc.)
- **Breadcrumb JSON-LD** auto-generado desde la URL
- **Organization JSON-LD** con redes sociales, credenciales y área de servicio
- **WebSite JSON-LD** con publisher ref
- **Schema adicional** por página (pasado via prop `schema`)
- **Open Graph:** og:title, og:description, og:url, og:type, og:image (1200×630), og:locale por idioma
- **Twitter Card:** summary_large_image con @lracloudops

### Imágenes y assets
- Favicons: ICO + SVG + PNG en 11 resoluciones (16 a 512px) + Apple touch icon + Android chrome + MST tile
- OG image: `/og-image.png` (estática, regenerable via `generate-og.mjs`)
- Imágenes de equipo en `/public/images/` (JPG)
- Fonts self-hosted via Fontsource npm (no dependencia de Google Fonts CDN) — mejora GDPR y LCP
- Cache de imágenes: `max-age=31536000, immutable` vía `_headers`

### PWA
**Configurado.** `public/site.webmanifest`:
- `display: standalone`
- `theme_color: #0A2540`
- Iconos: 192×192, 512×512 PNG + SVG

### Seguridad de headers
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()
Content-Security-Policy: (CSP completa con self + Cloudflare + GTM + Web3Forms)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin-allow-popups
Cross-Origin-Resource-Policy: same-site
```

---

## 8. ESTADO DEL CÓDIGO

### Archivos de configuración encontrados vs esperados

| Archivo | Estado |
|---|---|
| `package.json` | ✅ Presente |
| `astro.config.mjs` | ✅ Presente |
| `.prettierrc` | ✅ Presente |
| `playwright.config.ts` | ✅ Presente |
| `.lighthouserc.json` | ✅ Presente |
| `.github/workflows/build.yml` | ✅ Presente |
| `.github/dependabot.yml` | ✅ Presente |
| `public/_headers` | ✅ Presente |
| `public/_redirects` | ✅ Presente |
| `public/site.webmanifest` | ✅ Presente |
| `public/robots.txt` | ✅ Presente |
| `.gitignore` | ✅ Presente |
| `tsconfig.json` | ⚠️ No encontrado (Astro lo inyecta internamente) |
| `.env.example` | ❌ No encontrado — solo `.env.local` con clave activa |
| `eslint.config.*` | ❌ No encontrado — no hay linting de JS/TS |

### TODOs / FIXMEs en el código
**Ninguno encontrado.** Grep sobre `*.astro`, `*.ts`, `*.mjs` en `src/` retornó 0 resultados para `TODO`, `FIXME`, `HACK`, `XXX`.

**Observación secundaria:** `AgentChat.astro` contiene dos `console.log` de debug en producción (líneas 459 y 484), que deben eliminarse o reemplazarse por manejo silencioso de errores.

### Archivos grandes o inusuales

| Archivo | Líneas | Observación |
|---|---|---|
| `src/layouts/Layout.astro` | **2 537** | Monolito: navbar, language switcher, footer, JS dropdowns, mobile drawer |
| `src/pages/en/index.astro` | **2 197** | Homepage EN sin abstraer secciones |
| `src/pages/index.astro` | **1 960** | Homepage ES sin abstraer secciones |
| `src/pages/en/resources.astro` | **1 469** | Recursos EN con lógica de filtros inline |
| `src/pages/resources.astro` | **1 406** | Recursos ES duplicado |
| `src/pages/en/about.astro` | **1 342** | About con tech expertise inline |

Los homepages EN y ES son prácticamente duplicados con traducción inline — sin componentes de sección.

### Últimos commits (git log --oneline -10)
```
7c8fcef feat: reorder ES homepage — architecture first, then metrics, tech strip, projects, services, hero
bd46abf feat: reorder ES homepage — tech strip and projects first, hero moved down
21ace30 Merge pull request #145 from Liquenson/revert/hero-redesign-pr144
e069d6a Revert "Merge pull request #144 from Liquenson/feat/hero-flowdiagram-redesign"
ff5d4bd Merge pull request #144 from Liquenson/feat/hero-flowdiagram-redesign
cbe9cf0 feat: redesign hero — FlowDiagram as primary visual, relocate terminal mockup
dec1d29 Merge pull request #143 from Liquenson/feat/projects-grid-flowdiagram-consolidation
d451519 feat: add per-project mini flow diagrams to ProjectCard
852bd8a Merge pull request #142 from Liquenson/feat/projects-grid-flowdiagram-consolidation
bc437b6 feat: FlowDiagram + ProjectCard/ProjectsGrid components, consolidate duplicate project sections
```

Patrón visible: mucho reordenamiento del hero del homepage en los últimos PRs (incluye un revert de PR #144). Indica que la sección hero está inestable a nivel de diseño.

---

## 9. INSTRUCCIONES DE DESARROLLO

### Instalar dependencias
```bash
cd lracloudops
npm install        # o npm ci para reproducibilidad exacta
```
Requiere **Node.js ≥ 22.12.0**.

### Levantar entorno local
```bash
npm run dev
# Servidor disponible en http://localhost:4321
# Hot reload activado automáticamente
```

### Build de producción
```bash
npm run build
# Output en ./dist/
# Verificar: ls dist | wc -l  (debe haber archivos)

npm run preview   # Preview local del build estático en http://localhost:4321
```

### Ejecutar tests
```bash
npm test           # Playwright headless
npm run test:ui    # Playwright con interfaz gráfica interactiva
# El dev server debe estar corriendo en :4321 antes de ejecutar los tests
```

### Deploy
- **Automático:** hacer merge a `main` → Cloudflare Pages despliega automáticamente.
- **No se usa `wrangler deploy`** — la integración es directa vía GitHub App.
- El workflow CI (`build.yml`) valida antes de que Cloudflare recoja el commit.

### Añadir un nuevo proyecto al portafolio
1. Crear repo en `github.com/lra-cloud-ops/<nombre>`
2. Crear `src/content/projects/<slug>.md` con schema Zod válido:
   ```yaml
   ---
   titulo: "Nombre del Proyecto"
   descripcion: "Descripción breve"
   fecha: 2026-06-24
   categoria: "Platform Engineering"
   madurez: "In Development"   # Production | In Development | Reference | Starter
   stack: ["Kubernetes", "Terraform"]
   cicd: true
   github: "https://github.com/lra-cloud-ops/nombre"
   featured: false
   draft: false
   ---
   ```
3. `featured: false` mientras `In Development`, `true` en `Production`
4. `draft: false` para publicar

### Añadir un artículo de blog
- EN: `src/content/blog/<slug>.md`
- ES: `src/content/es/blog/<slug>.md`
- Frontmatter requerido: `titulo`, `descripcion`, `fecha`, `tags`, `draft`

### Variables de entorno locales
Crear `.env.local` con:
```env
PUBLIC_RESEND_API_KEY=re_XXXXXXXX
```

---

## 10. RECOMENDACIONES

### 1. Fragmentar `Layout.astro` (deuda técnica crítica)
Con 2 537 líneas, el layout es inmantenible. Se recomienda extraer:
- `src/components/Navbar.astro` — navbar con dropdowns
- `src/components/MobileDrawer.astro` — menú móvil
- `src/components/LanguageSwitcher.astro` — selector de idioma
- `src/components/Footer.astro` — footer
- `src/components/AnnouncementBar.astro` — barra superior

**Impacto:** reduce el riesgo de breaking changes en navbar y facilita el mantenimiento multilingüe.

### 2. Convertir los homepages en composición de componentes de sección
Los homepages (`index.astro` EN: 2 197 líneas, ES: 1 960 líneas) son casi idénticos con traducción inline. Se recomienda:
- Extraer `HeroSection`, `MetricsSection`, `TechStrip`, `ProjectsSection`, `ServicesSection`, `ArchitectureSection` como componentes con props de i18n
- Un único `index.astro` por locale que importa y ordena secciones
- Elimina el riesgo de divergencia entre EN y ES

**Impacto:** cada reordenamiento del homepage (los últimos 3 commits) actualmente requiere editar 2 archivos de ~2 000 líneas.

### 3. Crear `.env.example` y limpiar `console.log` de producción
- Añadir `.env.example` con `PUBLIC_RESEND_API_KEY=re_XXXXXXXX` para documentar la variable requerida.
- Eliminar `console.log('Status:', res.status)` y `console.log('Data:', data)` de `AgentChat.astro` (líneas 459 y 484) — exponen información del Worker en la consola del navegador.

### 4. Re-habilitar Prettier en CI y añadir ESLint
- El step de format check está comentado en `build.yml`. Reactivarlo evita deuda de estilo acumulada.
- Añadir ESLint con reglas para Astro + TypeScript detecta errores de linting que `astro check` no cubre.

### 5. Ampliar cobertura de tests Playwright
Los 10 smoke tests actuales no cubren:
- Navegación multilingüe real (cambiar idioma y verificar contenido en ES/EN/DE)
- Formulario de contacto (submit + respuesta)
- Páginas de blog con slug dinámico
- Rutas de industries y solutions
- Comportamiento del chat AI (mock del Worker)

Se recomienda añadir al menos 5 tests de ruta crítica para las rutas `/en/` y los dropdowns de navegación.

---

## Resumen de hallazgos clave

```
HALLAZGO 1: El sitio está en producción activa con 9 locales, 158 páginas .astro,
            10 blog posts por idioma y 6 proyectos. CI/CD robusto vía GitHub Actions
            + Cloudflare Pages, con seguridad HTTP bien configurada.

HALLAZGO 2: Layout.astro (2 537 líneas) y los homepages EN/ES (~2 000 líneas cada uno)
            son la deuda técnica más urgente — cada cambio de navegación o hero
            toca archivos monolíticos, como evidencian los últimos 3 PRs.

HALLAZGO 3: Locales secundarios (DE, FR, IT, PT-BR, JA, KO, ZH-CN) tienen cobertura
            parcial (10 páginas vs 45 de EN) y solo fallback a ES, lo cual puede
            limitar el alcance SEO en esos mercados a largo plazo.
```
