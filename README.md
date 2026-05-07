# lracloudops.com

![Astro](https://img.shields.io/badge/Astro-6.2-orange?logo=astro)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-blue?logo=tailwindcss)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange?logo=cloudflare)

Sitio web profesional de **LRA Cloud Operations** — plataforma de ingeniería cloud y DevOps con portfolio de proyectos reales, blog técnico y formulario de contacto.

---

## Stack

| Herramienta | Propósito |
|---|---|
| Astro 6.2 | Framework estático con Content Collections |
| Tailwind CSS 4 | Estilos con sistema de diseño azul (#0A2540 / #1E6FFF) |
| Cloudflare Pages | Hosting edge con deploy automático desde GitHub |
| Web3Forms | Formulario de contacto sin backend |
| Node.js ≥ 22.12 | Entorno de desarrollo |

---

## Estructura
src/
├── content/
│   ├── blog/          # Artículos técnicos en Markdown
│   └── projects/      # Case studies de proyectos
├── layouts/
│   └── Layout.astro   # Navbar + Footer global
├── pages/
│   ├── index.astro    # Home con hero, métricas y portfolio
│   ├── servicios.astro
│   ├── proyectos.astro
│   ├── contacto.astro
│   ├── blog/
│   └── projects/[slug].astro
└── styles/
└── global.css
---

## Inicio rápido

```bash
git clone https://github.com/Liquenson/lracloudops.git
cd lracloudops
npm install
npm run dev        # http://localhost:4321
```

---

## Deploy

Push a `main` → Cloudflare Pages despliega automáticamente en **lracloudops.com**

---

## Autor

**Liquenson Ruben** — Ingeniero DevOps
[LinkedIn](https://www.linkedin.com/in/liquenson-ruben-490961269) · [GitHub](https://github.com/Liquenson) · [lracloudops.com](https://lracloudops.com)
