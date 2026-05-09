---
titulo: "LRA Cloud Operations"
descripcion: "Sitio web de portafolio y marketing para la marca LRA Cloud Operations con blog técnico sobre DevOps y cloud. Construido con Astro 6 + Tailwind CSS 4, desplegado globalmente en Cloudflare Pages con CI/CD automático."
fecha: 2026-04-01
categoria: "Frontend & Web"
madurez: "Producción"
stack: ["Astro 6.2", "Tailwind CSS 4", "TypeScript", "Cloudflare Pages", "Web3Forms", "Content Collections"]
cicd: true
github: "https://github.com/Liquenson/lracloudops"
featured: false
iconPath: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
draft: false
metricas:
  - { label: "Páginas", value: "6 rutas" }
  - { label: "Build time", value: "< 30s" }
  - { label: "Deploy", value: "Edge global" }
  - { label: "Backend", value: "0 servidores" }
highlights:
  - "Static site generation con Astro: cero JavaScript de framework enviado al cliente por defecto"
  - "Tailwind CSS 4 via Vite plugin: compilación incremental sin configuración de purge manual"
  - "Content Collections API con schema Zod: blog y case studies validados en build time"
  - "Cloudflare Pages: deploy automático en cada push a main, CDN en 300+ edge locations"
  - "Web3Forms para el formulario de contacto: sin backend propio, sin Lambda, spam protection incluida"
  - "Sistema de diseño consistente sin UI frameworks: #0A2540 / #1E6FFF / #EEF4FF"
arquitectura:
  - { nombre: "Astro 6 SSG", descripcion: "Genera HTML estático en build time: sin runtime de servidor, máximo rendimiento inicial" }
  - { nombre: "Content Collections", descripcion: "Blog y case studies en Markdown con schema Zod validado antes del deploy" }
  - { nombre: "Tailwind CSS 4 + Vite", descripcion: "CSS utility-first cargado como Vite plugin sin archivo tailwind.config.js" }
  - { nombre: "Cloudflare Pages", descripcion: "Hosting edge global con CI/CD integrado: push → build → deploy en menos de 60s" }
  - { nombre: "Web3Forms", descripcion: "Formulario de contacto serverless con API key pública y protección anti-spam integrada" }
---

## Descripción del proyecto

LRA Cloud Operations es el sitio web de portafolio y marketing de la marca, construido con el stack de static site generation más moderno disponible. El objetivo era demostrar con el mismo sitio los principios que predica: rendimiento máximo, infraestructura mínima y automatización completa del deploy.

El sitio incluye 6 páginas principales — inicio, servicios, proyectos, blog, contacto y case studies individuales — sin un solo servidor que mantener.

## Por qué Astro

Astro resuelve un problema fundamental de los frameworks JavaScript modernos: envían demasiado JavaScript al cliente. Una página de portafolio no necesita hidratación del lado del cliente, routing dinámico ni un virtual DOM.

Con Astro, cada página se convierte en HTML estático en build time. El cliente recibe HTML puro — sin runtime de React, sin Angular, sin Vue. El resultado es un First Contentful Paint medido en décimas de segundo y un Lighthouse score que parte de 90+ sin optimizaciones adicionales.

## Content Collections con validación en build time

Los artículos del blog y los case studies de proyectos son archivos Markdown con frontmatter validado por un schema Zod. Si un artículo tiene un campo faltante o con el tipo incorrecto, el build falla — es imposible publicar contenido con metadata incorrecta.

```
src/content/
├── blog/          # Artículos del blog (.md con schema validado)
└── projects/      # Case studies de proyectos (.md con schema validado)
```

Los case studies incluyen campos estructurados: métricas numéricas, highlights en lista, y componentes de arquitectura — todo validado antes del deploy.

## Tailwind CSS 4 y el cambio de integración

La versión 4 de Tailwind CSS cambió significativamente la forma de integrarse con Astro. En lugar de `@astrojs/tailwind`, usa `@tailwindcss/vite` como plugin de Vite en `astro.config.mjs`. No hay `tailwind.config.js` — la configuración custom se hace en el archivo CSS con variables.

```css
/* En global.css: variables del sistema de diseño */
:root {
  --color-primary: #0A2540;
  --color-accent: #1E6FFF;
  --color-bg-soft: #EEF4FF;
}
```

## Sistema de diseño sin UI frameworks

El sitio no usa Shadcn, Material UI ni ninguna biblioteca de componentes. Todo el sistema de diseño son variables CSS + clases Tailwind. Esto mantiene el bundle mínimo y permite control total sobre el HTML generado.

La paleta es deliberadamente limitada a tres colores con significado semántico:
- `#0A2540` — dark navy para fondos de secciones hero y texto principal
- `#1E6FFF` — accent azul para CTAs, links activos, categorías y badges de Template
- `#EEF4FF` — soft blue para fondos de cards e iconos de categoría

## Despliegue en Cloudflare Pages

Cloudflare Pages detecta el push a `main`, ejecuta `npm run build`, y distribuye los artefactos en su CDN global con más de 300 edge locations. El tiempo entre push y disponibilidad en producción es típicamente menor a 60 segundos.

No hay servidor que gestionar, certificado SSL que renovar, ni escalado que configurar. La infraestructura es completamente invisible.

## Lessons learned

La mayor lección fue sobre el cambio de paradigma de Tailwind CSS 4. La versión 4 elimina `tailwind.config.js` en favor de configuración en CSS y el plugin de Vite. La integración con Astro requiere usar `@tailwindcss/vite` como plugin en `astro.config.mjs` — la documentación de Tailwind v3 no aplica y puede generar confusión durante la migración.

La segunda lección: Astro Content Collections valida el schema en build time, no en runtime. Añadir un campo obligatorio nuevo al schema de los case studies requiere actualizarlo en todos los archivos Markdown existentes simultáneamente — o marcarlo como opcional con `.optional()` en el schema Zod para mantener retrocompatibilidad.
