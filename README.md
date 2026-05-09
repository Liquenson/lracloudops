# LRA Cloud Operations — lracloudops.com

![Deploy](https://img.shields.io/github/deployments/Liquenson/lracloudops/production?label=deploy&logo=cloudflare)
![Astro](https://img.shields.io/badge/Astro-6.2-orange?logo=astro)
![Tailwind](https://img.shields.io/badge/Tailwind-4.2-06B6D4?logo=tailwindcss)
![AWS](https://img.shields.io/badge/AWS-Cloud-FF9900?logo=amazonaws)
![Kubernetes](https://img.shields.io/badge/Kubernetes-1.29-326CE5?logo=kubernetes)
![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform)
![License](https://img.shields.io/badge/license-MIT-22C55E)

> **Cloud & DevOps Engineering Platform** — Somos un equipo de ingenieros DevOps especializados en AWS, Kubernetes y Terraform. Resolvemos problemas reales de infraestructura: deploys manuales, entornos inconsistentes y plataformas que no escalan.

🌐 **[lracloudops.com](https://lracloudops.com)** · 📧 **hola@lracloudops.com** · ✓ Disponibles para proyectos freelance

---

## ¿Qué problemas resolvemos?

Infraestructura que falla, deploys manuales y entornos inconsistentes son problemas del pasado. Diseñamos plataformas cloud que se automatizan, escalan y monitorizan solas.

- ☁️ **Infraestructura que no falla** — Arquitecturas AWS multi-AZ con failover automático. Si un servidor cae, otro toma el control en segundos.
- 🔄 **Deploys sin miedo** — Pipelines CI/CD que validan, testean y despliegan automáticamente. Un push a main es suficiente.
- 📊 **Visibilidad total** — Métricas en tiempo real, alertas proactivas y logs centralizados con Prometheus y Grafana.
- 🐳 **Escalado sin downtime** — Kubernetes gestiona la carga automáticamente cuando el tráfico aumenta.
- 🤖 **Automatización real** — Eliminamos tareas manuales repetitivas con Ansible, Bash y GitHub Actions.
- 🔐 **Seguridad integrada** — IAM, Secrets Manager y GuardDuty desde el primer día, no como parche final.

---

## ¿Por qué elegirnos?

**Infraestructura que no falla** — Diseñamos arquitecturas multi-AZ en AWS con failover automático. Si un servidor cae, otro toma el control en segundos — sin intervención manual.

**Deploys sin miedo** — Nuestros pipelines CI/CD validan, testean y despliegan código automáticamente. Un push a main es suficiente para tener los cambios en producción.

**Visibilidad total** — Sabes exactamente qué pasa en tu infraestructura. Métricas en tiempo real, alertas proactivas y logs centralizados con Prometheus y Grafana.

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
│   ├── index.astro        # Home: hero, métricas, soluciones, portfolio
│   ├── servicios.astro    # Servicios orientados a problemas reales
│   ├── proyectos.astro    # Grid completo de proyectos
│   ├── contacto.astro     # Formulario de contacto
│   ├── blog/              # Artículos técnicos
│   └── projects/[slug]    # Case studies individuales
└── styles/
└── global.css         # Custom properties + tipografía
---

## Páginas del sitio

| Ruta | Descripción |
|---|---|
| `/` | Hero, métricas, por qué elegirnos, servicios, portfolio |
| `/servicios` | Servicios orientados a problemas que resolvemos |
| `/proyectos` | Grid de 10 proyectos con badges, stack y estado |
| `/projects/[slug]` | Case study con arquitectura y decisiones técnicas |
| `/blog` | Artículos técnicos sobre DevOps y cloud |
| `/contacto` | Formulario + info de contacto |

---

## Inicio rápido

```bash
git clone https://github.com/Liquenson/lracloudops.git
cd lracloudops
npm install
npm run dev        # http://localhost:4321
npm run build      # 10 páginas, 0 errores
```

**Requisitos:** Node.js ≥ 22.12

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

¿Tienes un problema de infraestructura? Cuéntanoslo. Respondemos en menos de 24h.

📧 [hola@lracloudops.com](mailto:hola@lracloudops.com)
🌐 [lracloudops.com/contacto](https://lracloudops.com/contacto)
💼 [LinkedIn](https://www.linkedin.com/in/liquenson-ruben-490961269)
🐙 [GitHub](https://github.com/Liquenson)

---

*Infraestructura cloud. Automatización real. Resultados medibles.*
