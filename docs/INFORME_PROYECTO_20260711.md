# Informe completo — Proyecto `lracloudops`

**Fecha del informe:** 11 de julio de 2026
**Basado en:** inspección directa del código fuente en `C:\Users\lique\workspace\lracloudops` (rama `main`, último commit `474e31e`)

> Este informe describe el **estado real y actual** del código, verificado archivo por archivo. Donde el `README.md` o `docs/architecture.md` del propio repositorio contradicen lo que hay en disco, se señala explícitamente al final (sección 12) — esos documentos están desactualizados.

---

## 1. Resumen ejecutivo

`lracloudops` es el sitio web corporativo/portfolio de **LRA Cloud Operations**, una consultoría de DevOps e infraestructura cloud liderada por Ruben Liquenson, con sede en Las Palmas de Gran Canaria. El sitio está construido como una **SPA estática** con Astro 6, sin backend propio: el contenido es 100% hardcodeado en los archivos `.astro`, no hay colecciones de contenido (`content collections`) activas, y la única "dinámica" real ocurre en build-time (fetch a la API de GitHub) y en runtime vía dos Cloudflare Workers externos (chat con IA y webhook de contacto).

El proyecto está en una versión **"v4.0 — Clean Slate"**: en algún momento (ver commits `v3/clean-slate`) el sitio fue reducido a un estado mínimo y reconstruido desde cero con un nuevo sistema de diseño (paleta estilo Google Cloud) y un catálogo de solo **4 proyectos open source reales**, sustituyendo una versión anterior mucho más grande (~130 páginas, blog, múltiples soluciones/industrias) que existió en versiones previas del sitio.

**Cifras actuales:**
- 29 archivos `.astro` en `src/pages/` (≈ 24 rutas únicas EN+ES, contando `[slug]` fijos)
- 2 idiomas: inglés (raíz, sin prefijo) y español (`/es/`)
- 0 colecciones de contenido activas (`src/content/` no existe)
- 2 Cloudflare Workers externos consumidos por el frontend (chat + webhook)
- 3 workflows de GitHub Actions
- ~8.000 líneas de código en `src/pages/`

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión (package.json) |
|---|---|---|
| Framework | Astro | `^6.4.6` |
| Estilos | Tailwind CSS (plugin de Vite) | `^4.3.1` |
| Tipografía | Red Hat Display / Text / Mono (`@fontsource`) | `^5.2.8` |
| Animaciones | GSAP + ScrollTrigger | `^3.15.0` |
| Scroll suave | Lenis | `^1.3.25` |
| Sitemap | `@astrojs/sitemap` | `^3.7.3` |
| Runtime | Node.js | `>=22.12.0` (requisito `engines`) |
| Deploy / Edge | Cloudflare Pages + Workers | `wrangler ^4.100.0` |
| Testing | Playwright | `^1.60.0` (1 spec: `tests/basic.spec.ts`) |
| Type checking | `@astrojs/check` + TypeScript | `^6.0.3` |
| Formato | Prettier + `prettier-plugin-astro` | `^3.8.4` |
| Iconos | `simple-icons` (npm, local, no CDN) | `^16.23.0` |

No hay framework de UI (React/Vue/Svelte) — todo es Astro puro con `<script>` inline vanilla TS/JS embebido en cada componente. Los estilos son mayoritariamente **inline (`style="..."`)** dentro de los propios archivos `.astro`, con clases CSS solo para estados responsivos (media queries) definidos en `<style>` al final de cada página o en `global.css`.

No hay lint configurado (ni ESLint ni script `lint` en `package.json`). El único gate de CI es `astro build` sin errores.

---

## 3. Estructura de directorios

```
lracloudops/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── build.yml            # CI: npm ci + astro build en cada push/PR
│       ├── smart-scan.yml       # Auditoría IA on-demand (workflow_dispatch)
│       └── sync-github.yml      # Cron diario 06:00 UTC — fuerza rebuild en Cloudflare
├── docs/                        # Documentación interna — ver sección 12 (desactualizada en parte)
│   ├── architecture.md
│   ├── architecture-report.md
│   ├── ci-cd.md, cloudflare-setup.md, monitoring.md, project-sync.md, webhook-setup.md
│   ├── multi-cloud-platform-README.md
│   └── audits/                  # 6 informes/auditorías históricas fechadas
├── functions/
│   └── tsconfig.json            # Carpeta vacía de facto — sin Cloudflare Pages Functions activas
├── public/
│   ├── _headers                 # Cabeceras de seguridad (CSP, HSTS, etc.) — ver sección 9
│   ├── _redirects                # Redirects legacy /en/* y rutas ES antiguas → rutas actuales
│   ├── favicon*.{ico,png,svg}   # 13 variantes de favicon (histórico, incluye "favicon-new")
│   ├── team/, images/           # Fotos del equipo
│   ├── aws-logo.svg, azure-logo.svg, google-cloud-logo.svg
│   ├── lracloudops-*.{svg,png}  # Logos de marca (5 variantes)
│   ├── og-image.png/.svg
│   ├── site.webmanifest, robots.txt
│   └── googleb12cc7a3d73d71e2.html  # Verificación Google Search Console
├── src/
│   ├── components/
│   │   ├── ChatWidget.astro          # Widget de chat flotante (ver sección 7)
│   │   ├── layout/Header.astro       # Navbar + menú móvil
│   │   ├── layout/Footer.astro       # Footer con selector de idioma
│   │   └── ui/Logo.astro
│   ├── data/
│   │   └── industry-diagrams.ts      # SVGs inline usados en la sección de tabs de la home
│   ├── layouts/
│   │   └── Layout.astro              # Único layout base (ver sección 5)
│   ├── lib/
│   │   ├── github.ts                 # Cliente de la API de GitHub, usado en build-time
│   │   ├── tagColors.ts              # Mapea nombres de tecnología → clases de color .tag-*
│   │   └── worker-config.ts          # Documentación (no importado) del system prompt del Worker de chat
│   ├── pages/                        # Ver inventario completo en sección 4
│   ├── scripts/
│   │   └── animations.ts             # Lenis + GSAP ScrollTrigger, animaciones globales
│   └── styles/
│       └── global.css                # Design tokens + reset + animaciones + clases .tag-*
├── workers/
│   └── webhook/                      # Cloudflare Worker independiente (repo separado de deploy)
│       ├── index.ts
│       ├── wrangler.toml
│       └── tsconfig.json
├── tests/
│   └── basic.spec.ts                 # Único test Playwright
├── astro.config.mjs
├── wrangler.jsonc                    # Config de Cloudflare Pages (nombre del proyecto: "lracloudops")
├── playwright.config.ts
├── .env.example
├── README.md                         # Desactualizado — ver sección 12
└── CLAUDE.md                         # Guía para Claude Code (parcialmente desactualizada)
```

**Nota:** `functions/` solo contiene un `tsconfig.json`, sin archivos de función reales. En versiones anteriores del sitio existieron Cloudflare Pages Functions para agentes de IA (`/infrastructure-review`, `/proposal`, `/cost-optimizer`, `/learn`); esas funciones ya no están en el árbol actual.

---

## 4. Inventario de páginas y rutas

### Rutas en inglés (canónicas, sin prefijo)

| Ruta | Archivo | Descripción |
|---|---|---|
| `/` | `index.astro` | Home — hero con red de nodos animada (SVG), tira de 4 proyectos, grid "What we build", tabs de casos de uso ("Built for DevOps scenarios"), stack tecnológico, proveedores cloud, CTA final |
| `/services` | `services.astro` | Auditoría gratuita (lra scan), consultoría mensual, stack |
| `/projects` | `projects.astro` | Grid de los 4 proyectos open source |
| `/projects/lra-ai-platform` | `projects/lra-ai-platform.astro` | Ficha del proyecto (516 líneas) |
| `/projects/aws-devops-agent` | `projects/aws-devops-agent.astro` | Ficha del proyecto (334 líneas) |
| `/projects/aws-terraform-devops` | `projects/aws-terraform-devops.astro` | Ficha del proyecto (129 líneas) |
| `/projects/k8s-on-premise` | `projects/k8s-on-premise.astro` | Ficha del proyecto (165 líneas) |
| `/about` | `about.astro` | CV real de Ruben Liquenson: skills, experiencia (Nibble Tech LLC, iCareMedical, DR Financial Services), educación |
| `/contact` | `contact.astro` | Formulario Web3Forms + webhook de Smart Scan |
| `/pricing` | `pricing.astro` | 3 planes: Auditoría gratis / Proyecto DevOps / Consultoría mensual €499 |
| `/login` | `login.astro` | Placeholder — formulario de lista de espera (Web3Forms) |
| `/dashboard` | `dashboard/index.astro` | Placeholder "Coming soon — pending backend en Railway" |
| `/privacy` | `privacy.astro` | Política de privacidad (32 líneas) |
| `/terms` | `terms.astro` | Términos de servicio (30 líneas) |
| `/404` | `404.astro` | Página de error |

### Rutas en español (`/es/`)

Espejo casi completo de las rutas EN, con slugs traducidos:

| Ruta | Archivo |
|---|---|
| `/es/` | `es/index.astro` |
| `/es/servicios` | `es/servicios.astro` |
| `/es/proyectos` | `es/proyectos.astro` |
| `/es/proyectos/lra-ai-platform`, `/aws-devops-agent`, `/aws-terraform-devops`, `/k8s-on-premise` | `es/proyectos/*.astro` |
| `/es/sobre-nosotros` | `es/sobre-nosotros.astro` |
| `/es/contacto` | `es/contacto.astro` |
| `/es/precios` | `es/precios.astro` |
| `/es/login` | `es/login.astro` |
| `/es/dashboard` | `es/dashboard/index.astro` |
| `/es/privacidad` | `es/privacidad.astro` |
| `/es/terminos` | `es/terminos.astro` |

No hay `/es/services`, `/es/about`, etc. — los slugs ES son totalmente distintos a los EN (patrón "Red Hat", ya documentado en `CLAUDE.md`), y el mapeo entre ambos vive **hardcodeado** en `src/layouts/Layout.astro` (objeto `routeMap`), no en un sistema de i18n de Astro con `src/i18n/ui.ts` (ese sistema, mencionado en `docs/architecture.md`, **no existe** en el código actual).

**Total de páginas construidas:** 29 archivos → build genera 29 páginas HTML (confirmado por el paso `Check pages` de `build.yml`, que cuenta `find dist -name "*.html"`).

---

## 5. Layout, i18n y componentes

### `src/layouts/Layout.astro`
Único layout base del sitio. Recibe props `title`, `description`, `lang` (por defecto `'en'`). Responsabilidades:
- Meta tags SEO completos: Open Graph, Twitter Card, canonical, `hreflang` (en/es/x-default)
- Carga de fuentes Google Fonts (Red Hat Display/Text)
- Google Analytics GA4 (`G-VVRS1XH4Z5`) cargado inline
- Script de **auto-redirect por idioma del navegador**: en la primera visita a `/`, si `navigator.language` empieza por `es`, redirige a `/es/` (usa `sessionStorage` para no repetir)
- Monta `<ChatWidget />` globalmente y arranca `initAnimations()` (Lenis + GSAP)
- Contiene el `routeMap` EN↔ES hardcodeado para generar los `hreflang` y el selector de idioma

### `src/components/layout/Header.astro`
Navbar sticky (64px), estilo Google Cloud: logo + 4 enlaces (Projects/Services/Pricing/About en EN; Proyectos/Servicios/Precios/Sobre nosotros en ES) + CTA "Get in touch" + menú hamburguesa en móvil (drawer lateral con overlay). Sin dropdowns — a diferencia de versiones anteriores del sitio, la navegación es plana.

### `src/components/layout/Footer.astro`
4 columnas (marca+certificaciones, proyectos, selector de idioma, contacto) que colapsan a 1 columna en móvil. Incluye:
- Selector de idioma en dropdown propio (no reutiliza el del header)
- Enlaces a los 4 repos de GitHub
- Certificaciones: ITLA, INFOTEP, Cisco Networking Academy
- Ubicación: Las Palmas de Gran Canaria
- Logos de Nibble Tech LLC e ITLA como "partners"

### `src/components/ChatWidget.astro`
Widget de chat flotante (esquina inferior derecha) que llama a un Cloudflare Worker externo (`https://lracloudops-agent.liquenson-cloud.workers.dev`) — ver sección 7.

### `src/components/ui/Logo.astro`
Componente de logo (no inspeccionado en detalle — reutilizable para el SVG de marca).

### `src/data/industry-diagrams.ts`
Exporta `industrySvgs`, un array de strings SVG inyectados con `set:html` en los 5 paneles de tabs de la home ("AI Agents", "AWS Infrastructure", "Kubernetes", "Security", "Natural Language AWS").

---

## 6. Sistema de diseño

Definido en `src/styles/global.css`, cabecera literal: **`LRA CloudOps — Design System v4.0 — Clean Slate`**.

### Paleta (inspirada en Google Cloud, no en la paleta azul-navy documentada en `CLAUDE.md`)

| Token CSS | Valor | Uso |
|---|---|---|
| `--color-primary` | `#0078D4` (custom property) / `#1A73E8` (hardcodeado en la mayoría de páginas) | Acciones primarias, enlaces activos |
| `--color-dark` | `#0D1B2E` | — |
| `--color-gray-900` (texto) | `#111827` / `#202124` (hardcodeado en páginas) | Texto principal |
| `--color-gray-600` (texto secundario) | `#4B5563` / `#5F6368` (hardcodeado) | Texto secundario |
| Borde | `#DADCE0` | Bordes de tarjetas, separadores |
| Fondo suave | `#F8F9FA` | Secciones alternas |
| Éxito | `#137333` | Badges de estado |
| Advertencia | `#F29900` | — |
| Error | `#C5221F` | — |

> ⚠️ Hay **dos paletas conviviendo**: las variables CSS en `:root` de `global.css` (`#0078D4`/`#0D1B2E`) frente a los colores **hardcodeados inline** en casi todas las páginas (`#1A73E8`/`#202124`/`#5F6368`/`#DADCE0`), que son los que realmente se ven en el sitio. Las variables CSS están prácticamente sin usar fuera de `global.css` mismo.

### Tipografía
Red Hat Display (headings, pesos 700/900), Red Hat Text (body, 400/600), Red Hat Mono (código/badges/stats) — vía `@fontsource` (paquete npm, sin dependencia de CDN) + Google Fonts como refuerzo en `Layout.astro`.

### Animaciones
- Lenis para scroll suave con inercia natural
- GSAP + ScrollTrigger para animaciones de entrada (`data-animate="fade-up"`, `data-animate="stagger"`)
- Regla de seguridad explícita en el código: *"Always use gsap.from() — content is visible by default"* → el contenido nunca depende de JS para ser visible
- `prefers-reduced-motion: reduce` respetado en CSS y JS

### Clases de tag por tecnología
`.tag-python`, `.tag-terraform`, `.tag-kubernetes`, `.tag-aws`, `.tag-docker`, `.tag-helm`, `.tag-argocd`, `.tag-security`, `.tag-github`, `.tag-sonarcloud`, `.tag-ansible`, `.tag-vagrant`, `.tag-ai` — cada una con su propio color de fondo/texto/borde, resueltas dinámicamente por `src/lib/tagColors.ts` a partir del nombre de la tecnología.

---

## 7. Integraciones dinámicas

El sitio es estático, pero depende de **tres servicios externos** en tiempo de ejecución/build:

### a) Cloudflare Worker de chat — `lracloudops-agent`
- Consumido por `ChatWidget.astro` vía `fetch()` a `https://lracloudops-agent.liquenson-cloud.workers.dev`
- **El Worker en sí no vive en este repo** — `src/lib/worker-config.ts` es solo documentación de referencia del *system prompt* (comentario explícito: *"This file is documentation only — it is not imported or deployed"*)
- El prompt describe un asesor DevOps que conoce los 4 proyectos reales, precios (€199–2.500 según servicio, €499/mes consultoría) y contacto — actualizado para no inventar proyectos ni métricas no verificadas

### b) Cloudflare Worker de webhook — `workers/webhook/index.ts`
- Sí vive en este repo (`workers/webhook/`), con su propio `wrangler.toml` — deploy independiente del sitio principal
- Endpoint público sin autenticación (por diseño, documentado como riesgo residual en `docs/webhook-setup.md`)
- Llamado desde `contact.astro`/`es/contacto.astro` junto al envío nativo de Web3Forms
- Si el visitante indica un repo de GitHub, dispara vía `workflow_dispatch` el workflow `smart-scan.yml` del propio repo `lracloudops` (usando `GITHUB_TOKEN` con permiso de disparo de Actions)
- Envía opcionalmente una alerta interna por email vía Resend (`RESEND_API_KEY`, no-op si no está configurada)

### c) API de GitHub — `src/lib/github.ts`
- Cliente usado **solo en build-time** (`astro build`), nunca en el navegador
- Consulta repos/commits/lenguajes de los 4 repos de `github.com/lra-cloud-ops`
- Soporta un archivo opcional `.lracloudops.json` en cada repo externo para que el propio proyecto controle su descripción/stats/tags sin tocar este repo (documentado con la salvedad de que aun así requiere un rebuild manual o el cron diario, ya que no hay webhook listener para *otros* repos)
- Usa `GITHUB_TOKEN` opcional (sube el rate limit de 60 a 5.000 req/h)

### d) Web3Forms
- Formularios de `contact.astro`, `login.astro`, `dashboard/index.astro` envían directamente a `https://api.web3forms.com/submit` con una `access_key` hardcodeada en el HTML (`e8aaab4e-270c-4163-bb76-6a8dfc247485`) — sin backend propio

---

## 8. CI/CD — GitHub Actions

| Workflow | Trigger | Qué hace |
|---|---|---|
| `build.yml` | Push a `main`/`v3/clean-slate`, PRs a `main` | `npm ci` + `astro build`, cuenta páginas generadas en el step summary. Único gate de calidad — **no hay lint ni tests en CI** |
| `smart-scan.yml` | `workflow_dispatch` (disparado por el webhook Worker o manualmente) | Clona `lra-cloud-ops/lra-ai-platform`, instala Trivy, ejecuta `smart_scan.py` con `ANTHROPIC_API_KEY` + `RESEND_API_KEY` — genera y envía por email un informe de auditoría de seguridad IA sobre el repo indicado por el cliente |
| `sync-github.yml` | Cron diario `0 6 * * *` + manual | Solo hace `curl` al Deploy Hook de Cloudflare Pages para forzar un rebuild — así los datos de GitHub (stars, commits) obtenidos en build-time se refrescan aunque no haya push nuevo |

**Despliegue:** push a `main` → Cloudflare Pages (integración directa con GitHub, no `wrangler deploy`) construye y publica en `lracloudops.com`. `wrangler.jsonc` solo fija el nombre del proyecto Pages y el directorio de salida (`./dist`).

`.github/dependabot.yml` existe pero no fue inspeccionado en detalle.

---

## 9. Seguridad y SEO

### `public/_headers` (Cloudflare Pages headers)
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restringe cámara/micrófono/geolocalización/pago/USB/bluetooth
- **CSP** afinada explícitamente para: Astro estático + Google Fonts + Web3Forms + Cloudflare Turnstile + los dos Workers propios + Google Analytics
- HSTS con `preload`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`
- Cache inmutable de 1 año para `/images/*`

### `public/_redirects`
Dos bloques de redirects 301: rutas legacy `/en/*` → rutas raíz actuales, y rutas ES antiguas sin prefijo (`/nosotros`, `/servicios`, `/contacto`...) → sus equivalentes bajo `/es/`.

### SEO
- `@astrojs/sitemap` configurado con `hreflang` `en-US`/`es-ES` en `astro.config.mjs`
- `robots.txt`, `site.webmanifest` (PWA-ready, tema `#0A2540`)
- Verificación de Google Search Console vía archivo HTML en `public/`
- Meta tags OG/Twitter completos por página, generados en `Layout.astro`

---

## 10. Contenido y "portfolio"

- **No existe `src/content/`** — no hay colecciones de blog ni de proyectos gestionadas por Astro Content Collections en este momento. Toda la información de los 4 proyectos está hardcodeada directamente en `src/pages/projects/*.astro` (y su espejo ES).
- Los 4 proyectos reales referenciados en todo el sitio (home, footer, `/projects`, chat, Smart Scan):
  1. **lra-ai-platform** — 8 agentes especializados, 14 integraciones, 9 workflows, 33 tests, motor de gobernanza con 5 niveles RBAC
  2. **aws-devops-agent** — agente IA en bucle tool-use, 31 funciones boto3, 24 servicios AWS en lenguaje natural
  3. **aws-terraform-devops** — 7 módulos Terraform, EKS 1.31, RDS PostgreSQL 15, CI/CD dual (GitHub Actions + Jenkins), SonarCloud
  4. **k8s-on-premise** — cluster kubeadm desde cero (1 master + 2 workers), Calico, NGINX Ingress, ArgoCD GitOps
- Equipo mostrado en `/about`: solo el CV de **Ruben Liquenson** (Nibble Tech LLC → iCareMedical → DR Financial Services). No hay página de equipo con múltiples personas en el estado actual — a diferencia de versiones anteriores documentadas en memoria histórica que mencionaban 4 ingenieros.

---

## 11. Testing

- **Playwright** configurado (`playwright.config.ts`), un único spec: `tests/basic.spec.ts` — no se inspeccionó su contenido detallado en este informe, pero por el nombre cubre humo básico, no una suite exhaustiva.
- Lighthouse CI configurado (`.lighthouserc.json`) pero no hay workflow de GitHub Actions que lo ejecute automáticamente — no está cableado a CI en `build.yml`.
- No hay tests unitarios (no hay Vitest/Jest ni test runner de componentes).

---

## 12. Discrepancias detectadas con la documentación del propio repo

Al comparar el código real con `README.md` y `docs/architecture.md`, ambos documentos describen una **versión anterior y distinta** del sitio que ya no existe en el árbol actual:

| Documento afirma | Realidad en disco |
|---|---|
| `README.md`: estructura con `src/content/blog/` y `src/content/projects/` con 11 case studies | No existe `src/content/` en absoluto |
| `README.md`: rutas `servicios.astro`, `proyectos.astro`, `sobre-nosotros.astro`, `contacto.astro` en la raíz de `src/pages/` | Esas son las rutas **ES** bajo `src/pages/es/`; la raíz usa slugs en inglés |
| `README.md`: tabla de "10 proyectos documentados" (NexoraTech, TBF Cloud Infrastructure, Medical Appointment System, etc.) y equipo de 4 ingenieros | El sitio actual solo referencia 4 repos de `lra-cloud-ops` y un único perfil (Ruben Liquenson) en `/about` |
| `docs/architecture.md`: rutas `/blog`, `/cloud-infrastructure`, `/platform-engineering`, `/devops-automation`, `/observability`, `/pricing`... con `src/i18n/ui.ts` (79 keys) y `SolutionLayout.astro`/`AgentChat.astro` | Ninguno de esos archivos ni la mayoría de esas rutas existen; el mapeo EN↔ES vive hardcodeado en `Layout.astro`, y el chat es `ChatWidget.astro`, no `AgentChat.astro` |
| `docs/architecture.md`: paleta `#0A2540`/`#1E6FFF`, fuentes Inter + JetBrains Mono | El CSS real usa Red Hat Display/Text/Mono y paleta `#0078D4`/`#1A73E8` |

**Conclusión:** ambos documentos quedaron congelados en una iteración previa del sitio (probablemente antes del "Clean Slate" v4.0) y deberían actualizarse o eliminarse para evitar confusión — este informe puede usarse como base para reescribirlos.

---

## 13. Historial reciente (últimos 10 commits en `main`)

```
474e31e feat: update favicon pestaña web
928cde3 fix: hreflang x-default pointed at homepage on every page
0e7e0a1 fix: pass GITHUB_TOKEN to Smart Scan step for authenticated clones
9f481cd feat: internal notification alert on new smart-scan requests
1034a0c feat: privacy policy and terms of service EN+ES
f0f0052 feat: full automation — webhook worker + contact form integration
f54fd86 feat: smart scan workflow — AI-powered security audit report
2d42ef7 feat: update og-image.png with new brand logo design
50ebfdc security: add rel=noopener noreferrer, npm audit fix
9dd5d27 feat: cloud platforms — brand colors for AWS, Azure, Google Cloud
```

El trabajo reciente se ha centrado en: cerrar el ciclo de auditoría automatizada (Smart Scan + webhook + notificación interna), páginas legales (privacidad/términos), y pulido visual/SEO (favicons, hreflang, logos de proveedores cloud).

---

## 14. Resumen de arquitectura (diagrama textual)

```
Visitante
   │
   ▼
Cloudflare Pages (lracloudops.com) ── sitio estático Astro, build vía GitHub Actions
   │
   ├── Formularios (contact/login/dashboard) ──► Web3Forms (envío directo, sin backend propio)
   │
   ├── ChatWidget.astro ──► Cloudflare Worker "lracloudops-agent" (repo externo, no versionado aquí)
   │
   └── contact.astro / es/contacto.astro ──► Cloudflare Worker "workers/webhook/" (este repo)
                                                   │
                                                   ├──► GitHub Actions API: dispara smart-scan.yml
                                                   │        │
                                                   │        └──► clona lra-ai-platform, corre Trivy +
                                                   │             smart_scan.py, envía informe por email
                                                   │
                                                   └──► (opcional) Resend API: alerta interna a info@lracloudops.com

Build time (astro build):
   src/lib/github.ts ──► GitHub REST API (repos lra-cloud-ops/*) ──► stats inyectadas en páginas de proyecto

Cron diario (sync-github.yml):
   GitHub Actions ──► Cloudflare Deploy Hook ──► fuerza rebuild para refrescar stats de GitHub
```

---

*Fin del informe. Generado por inspección directa de archivos — no basado en documentación previa desactualizada del propio repositorio.*
