# LRA Cloud Operations — lracloudops.com

![Deploy](https://img.shields.io/github/deployments/Liquenson/lracloudops/production?label=deploy&logo=cloudflare)
![Astro](https://img.shields.io/badge/Astro-6.2-orange?logo=astro)
![Tailwind](https://img.shields.io/badge/Tailwind-4.2-06B6D4?logo=tailwindcss)
![AWS](https://img.shields.io/badge/AWS-Cloud-FF9900?logo=amazonaws)
![Kubernetes](https://img.shields.io/badge/Kubernetes-1.29-326CE5?logo=kubernetes)
![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform)
![License](https://img.shields.io/badge/license-MIT-22C55E)

> **Cloud & DevOps Engineering Platform** — Plataforma técnica de un equipo de 3 ingenieros DevOps especializados en AWS, Kubernetes y automatización de infraestructura cloud enterprise.

🌐 **[lracloudops.com](https://lracloudops.com)** · 📧 **hola@lracloudops.com** · ✓ Disponibles para proyectos freelance

---

## ¿Quiénes somos?

Somos un equipo de **3 ingenieros DevOps freelance** especializados en infraestructura cloud, automatización y platform engineering. Diseñamos, desplegamos y mantenemos plataformas de producción reales usando las mismas herramientas que usan empresas como Airbnb, Netflix y Spotify.

**Lo que ofrecemos:**
- ☁️ Arquitectura AWS multi-AZ con Terraform modular
- 🔄 Pipelines CI/CD completos con GitHub Actions y ArgoCD
- 🐳 Orquestación de contenedores con Kubernetes y Helm
- 📊 Observabilidad con Prometheus, Grafana y CloudWatch
- 🤖 Automatización de infraestructura con Ansible y Bash
- 🔐 Seguridad cloud con IAM, Secrets Manager y GuardDuty

---

## ¿Por qué elegirnos?

**Experiencia real** — Cada proyecto en nuestro portfolio corre en producción real. No hacemos demos.

**Stack enterprise** — Trabajamos con las mismas herramientas que usan empresas de referencia: Terraform, ArgoCD, Prometheus y GitHub Actions.

**Entrega rápida** — Nuestra infraestructura como código permite desplegar entornos completos en minutos, no semanas. Todo versionado, todo reproducible.

---

## Métricas del equipo

| Métrica | Valor |
|---|---|
| Proyectos cloud en producción | 10+ |
| Servicios AWS gestionados | 25+ |
| Ingenieros especializados | 3 |
| Infraestructura como código | 100% |

---

## Stack técnico del sitio

| Capa | Tecnología | Propósito |
|---|---|---|
| Framework | Astro 6.2 + Content Collections | Páginas estáticas + case studies |
| Estilos | Tailwind CSS 4 | Design system (#0A2540 / #1E6FFF) |
| Deploy | Cloudflare Pages | Edge global, HTTPS automático |
| Formulario | Web3Forms | Contacto sin backend |
| Tipografía | Inter + JetBrains Mono | UI + código |
| SEO | OG tags + Twitter cards + keywords | LinkedIn y Google optimizados |

---

## Estructura del proyecto
src/
├── content/
│   ├── blog/              # Artículos técnicos en Markdown
│   └── projects/          # Case studies con schema completo
├── layouts/
│   └── Layout.astro       # Navbar mobile/desktop + footer + SEO global
├── pages/
│   ├── index.astro        # Home: hero, métricas, por qué elegirnos, portfolio
│   ├── servicios.astro    # Servicios DevOps
│   ├── proyectos.astro    # Grid de proyectos
│   ├── contacto.astro     # Formulario de contacto
│   ├── blog/              # Listado + artículos individuales
│   └── projects/[slug]    # Case studies individuales
└── styles/
└── global.css         # Custom properties + Inter + JetBrains Mono
---

## Páginas del sitio

| Ruta | Descripción |
|---|---|
| `/` | Hero, métricas, por qué elegirnos, servicios, tecnologías, portfolio |
| `/servicios` | Servicios DevOps detallados |
| `/proyectos` | Grid completo de 10 proyectos con badges y stack |
| `/projects/[slug]` | Case study individual con arquitectura y decisiones técnicas |
| `/blog` | Artículos técnicos sobre DevOps y cloud |
| `/contacto` | Formulario Web3Forms + info de contacto |

---

## Inicio rápido

```bash
git clone https://github.com/Liquenson/lracloudops.git
cd lracloudops
npm install
npm run dev        # http://localhost:4321
npm run build      # Build de producción — 10 páginas, 0 errores
```

**Requisitos:** Node.js ≥ 22.12

---

## Deploy

Cada push a `main` despliega automáticamente en **lracloudops.com** vía Cloudflare Pages. Sin configuración adicional.

---

## Proyectos documentados

Case studies disponibles en [lracloudops.com/proyectos](https://lracloudops.com/proyectos):

| Proyecto | Stack | Estado |
|---|---|---|
| AWS Terraform DevOps | Terraform + EKS + RDS + GitHub Actions | Producción |
| TBF Cloud Infrastructure | Spring Boot + React + ECS Fargate + Terraform | Producción |
| AWS DevOps Agent | Python + Claude AI + boto3 + 25 servicios AWS | Demo |
| Linux Fleet Manager | Bash + ShellCheck + GitHub Actions multi-OS | Producción |
| K8s DevOps Platform | Kubernetes + ArgoCD + GitOps + KinD | Demo |
| Docker DevOps Platform | FastAPI + PostgreSQL + Docker Compose | En desarrollo |
| Medical Appointment System | Spring Boot 3 + PostgreSQL + Docker | En desarrollo |
| Python CI/CD Template | Flask + pytest + Docker + GitHub Actions | Template |
| Spring Boot REST Template | Java + Spring Boot + Swagger + Jib | Template |

---

## Contacto

Disponibles para proyectos freelance de infraestructura cloud, automatización DevOps y consultoría AWS. Respondemos en menos de 24h.

📧 [hola@lracloudops.com](mailto:hola@lracloudops.com)
🌐 [lracloudops.com/contacto](https://lracloudops.com/contacto)
💼 [LinkedIn](https://www.linkedin.com/in/liquenson-ruben-490961269)
🐙 [GitHub](https://github.com/Liquenson)

---

*Infraestructura cloud. Automatización real. Resultados medibles.*
