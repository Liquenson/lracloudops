# LRA Cloud Operations

[![Deploy](https://img.shields.io/github/deployments/Liquenson/lracloudops/production?label=deploy&logo=cloudflare&logoColor=white)](https://lracloudops.com)
[![Astro](https://img.shields.io/badge/Astro-6.2-FF5D01?logo=astro&logoColor=white)](https://astro.build)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![License](https://img.shields.io/badge/license-MIT-22C55E)](LICENSE)

> **Cloud & DevOps Engineering Platform** — Equipo de ingenieros especializados en AWS, Kubernetes y Terraform. Infraestructura cloud que se automatiza, escala y monitoriza sola.

🌐 **[lracloudops.com](https://lracloudops.com)** · 📧 **hola@lracloudops.com** · ✓ Disponibles para proyectos freelance

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Astro 6.2 + Content Collections |
| Estilos | Tailwind CSS 4 · Design system `#0A2540` / `#1E6FFF` |
| Deploy | Cloudflare Pages · Edge global · HTTPS automático |
| Tipografía | Inter + JetBrains Mono |
| Formulario | Web3Forms |
| SEO | OG tags · Twitter cards · Schema.org · Sitemap |

---

## Inicio rápido

```bash
git clone https://github.com/Liquenson/lracloudops.git
cd lracloudops
npm install
npm run dev       # → http://localhost:4321
npm run build     # → 24 páginas, 0 errores
```

**Requisito:** Node.js ≥ 22.12

---

## Estructura

```
src/
├── content/
│   ├── blog/              # Artículos técnicos en Markdown
│   └── projects/          # 11 case studies con schema completo
├── layouts/
│   └── Layout.astro       # Navbar · Footer · SEO global
├── pages/
│   ├── index.astro        # Home — hero, métricas, portfolio
│   ├── servicios.astro    # Servicios + precios
│   ├── proyectos.astro    # Grid de proyectos
│   ├── sobre-nosotros.astro # Equipo de 4 ingenieros
│   ├── contacto.astro     # Formulario de contacto
│   ├── blog/[slug].astro  # Artículos individuales
│   └── projects/[slug].astro # Case studies individuales
└── styles/
    └── global.css         # Design tokens + tipografía
```

---

## Proyectos documentados

| Proyecto | Stack | Estado |
|---|---|---|
| NexoraTech | Spring Boot 4 · React 18 · ECS Fargate · Terraform | Producción |
| TBF Cloud Infrastructure | Spring Boot 4 · React 18 · ECS · CloudFront · Terraform | Producción |
| AWS Terraform DevOps | Flask · EKS 1.31 · Terraform 1.9.8 · Helm · SonarCloud | Producción |
| Linux Fleet Manager | Bash 4.0+ · SSH · ShellCheck · CI/CD multi-OS | Producción |
| AWS DevOps Agent | Python · Claude Sonnet 4.6 · boto3 · 25+ servicios AWS | En desarrollo |
| Docker DevOps Platform | FastAPI 0.115 · PostgreSQL 15 · Docker Compose | En desarrollo |
| K8s DevOps Platform | Kubernetes 1.29 · ArgoCD · KinD · GitOps | Demo |
| Medical Appointment System | Spring Boot 3.2.5 · PostgreSQL · Docker | En desarrollo |
| Python CI/CD Template | Flask 3.0.3 · pytest 8.2 · flake8 · Docker | Template |
| Spring Boot REST Template | Spring Boot 2.7.13 · Swagger · Jib · MapStruct | Template |

---

## Deploy

Push a `main` → Cloudflare Pages despliega automáticamente en **lracloudops.com**.

```bash
# Deploy manual
npx wrangler pages deploy dist/
```

---

## Equipo

4 ingenieros DevOps especializados en AWS, Kubernetes y Platform Engineering.

| Ingeniero | Rol | Especialización |
|---|---|---|
| Ruben Liquenson | DevOps · Cloud Engineer | AWS · EKS · Terraform · GitOps |
| Kelvin Osaigbovo | DevOps · Platform Engineer | AWS · Azure · Kubernetes · CI/CD |
| Wesley Osaigbovo | DevOps · Cloud Engineer | AWS · Terraform · ArgoCD · BBVA |
| Darwin Pochet | Project Management | IT · Redes · Ciberseguridad · Fortinet |

---

## Contacto

📧 [hola@lracloudops.com](mailto:hola@lracloudops.com)
🌐 [lracloudops.com/contacto](https://lracloudops.com/contacto)
💼 [LinkedIn](https://www.linkedin.com/in/ruben-alexis-liquenson-490961269)
🐙 [GitHub](https://github.com/Liquenson)

---

*Infraestructura cloud. Automatización real. Resultados medibles.*
