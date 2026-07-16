Actualiza README.md con el estado real actual del proyecto.

Lee el estado actual:
find src/pages -name "*.astro" | wc -l
find dist -name "*.html" | wc -l
ls src/components/ui/
ls src/components/layout/
ls public/js/ | wc -l

Actualiza README.md corrigiendo:

1. "29 pages" → número real de páginas
2. Sección Structure — actualiza con componentes reales:
   src/
   ├── pages/          # 40 pages — EN (root) + ES (/es/)
   ├── components/
   │   ├── layout/     # Header, Footer, ChatWidget
   │   └── ui/         # Button, Badge, Card, FormField, Section, SectionHeader, DiagramIcon
   ├── layouts/        # Layout.astro (single base layout)
   ├── lib/            # github.ts, tagColors.ts, worker-config.ts
   ├── data/           # industry-diagrams.ts
   ├── scripts/        # animations.ts (Lenis + GSAP)
   └── styles/         # global.css (Design System v4.1)

   public/
   ├── js/             # 10 externalized scripts (CSP compliance)
   ├── .well-known/    # security.txt (RFC 9116)
   └── site.webmanifest

   workers/
   └── webhook/        # Cloudflare Worker — Smart Scan trigger

3. Añade sección Security:
   ## Security
   - CSP without unsafe-inline (scripts externalized to public/js/)
   - HSTS: 2 years with preload
   - X-Frame-Options: DENY
   - security.txt: /.well-known/security.txt
   - Vulnerability disclosure: /security
   - Full policy: SECURITY.md

4. Corrige About en español → inglés:
   "Platform Engineering consultancy website for LRA CloudOps.
   Production-grade open source projects: IaC, Kubernetes, GitOps and AI orchestration."

5. Actualiza la tabla de variables de entorno añadiendo:
   | Variable | Purpose |
   | GITHUB_TOKEN | GitHub API rate limit (5000/hr vs 60/hr) |
   | ANTHROPIC_API_KEY | Smart Scan AI report generation |
   | RESEND_API_KEY | Smart Scan email delivery |
   | PUBLIC_GA_ID | Google Analytics GA4 |
   | PUBLIC_CF_BEACON | Cloudflare Web Analytics |

git add README.md
git commit -m "docs: update README — 40 pages, real structure, security section"
git push origin main

Reporta qué cambió.