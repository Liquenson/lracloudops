/**
 * Centralized UI string dictionary for all supported locales.
 *
 * Route strategy:
 *   /          → English (default, no prefix)
 *   /es/...    → Spanish
 *
 * To add Spanish translations: fill in the 'es' keys below.
 * To activate routing: enable `i18n` in astro.config.mjs and add
 * src/pages/es/ as a mirror of src/pages/ with translated content.
 *
 * Content strategy (blog / projects):
 *   English originals stay in src/content/blog/ and src/content/projects/.
 *   Spanish versions go in src/content/es/blog/ and src/content/es/projects/
 *   as separate markdown files, sharing the same slug/id.
 */

export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const ui = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.solutions': 'Solutions',
    'nav.industries': 'Industries',
    'nav.resources': 'Resources',
    'nav.whylra': 'Why LRA',
    'nav.pricing': 'Pricing',
    'nav.caseStudies': 'Case Studies',
    'nav.about': 'About',
    'nav.blog': 'Blog',
    'nav.cta': 'Schedule Consultation',

    // Footer — section headers
    'footer.solutions': 'Solutions',
    'footer.resources': 'Resources',
    'footer.company': 'Company',

    // Footer — Solutions links
    'footer.cloudInfrastructure': 'Cloud Infrastructure',
    'footer.platformEngineering': 'Platform Engineering',
    'footer.devopsAutomation': 'DevOps Automation',
    'footer.observability': 'Observability',

    // Footer — Resources links
    'footer.blog': 'Blog',
    'footer.github': 'GitHub',

    // Footer — Company links
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.pricing': 'Pricing',
    'footer.security': 'Security',
    'footer.whylra': 'Why LRA',
    'footer.bookConsultation': 'Book a Consultation',

    // Footer — brand / status
    'footer.tagline':
      'Cloud infrastructure, Kubernetes platforms and DevOps automation. Production AWS environments built as code.',
    'footer.available': 'Available for new projects',
    'footer.copyright': '© 2026 LRA Cloud Ops. All rights reserved.',
    'footer.edge': 'Cloudflare Edge Network',

    // Blog
    'blog.back': 'Back to Blog',
    'blog.contact': 'Have questions? Get in touch',
    'blog.read': 'Read',
    'blog.comingSoon': 'Articles coming soon.',
    'blog.noResults': 'No articles in this category yet.',
    'blog.categories.all': 'All',

    // Projects / Case Studies
    'projects.production': 'Production',
    'projects.inDevelopment': 'In Development',
    'projects.reference': 'Reference',
    'projects.starter': 'Starter',

    // Shared CTAs
    'cta.getInTouch': 'Get in touch',
    'cta.viewCaseStudies': 'View case studies',
    'cta.viewOnGitHub': 'View on GitHub',
  },
  es: {
    // Navigation
    'nav.home': 'Inicio',
    'nav.solutions': 'Soluciones',
    'nav.industries': 'Industrias',
    'nav.resources': 'Recursos',
    'nav.whylra': 'Por qué LRA',
    'nav.pricing': 'Precios',
    'nav.caseStudies': 'Casos de uso',
    'nav.about': 'Nosotros',
    'nav.blog': 'Blog',
    'nav.cta': 'Reservar consulta',

    // Footer — section headers
    'footer.solutions': 'Soluciones',
    'footer.resources': 'Recursos',
    'footer.company': 'Empresa',

    // Footer — Solutions links
    'footer.cloudInfrastructure': 'Infraestructura Cloud',
    'footer.platformEngineering': 'Platform Engineering',
    'footer.devopsAutomation': 'Automatización DevOps',
    'footer.observability': 'Observabilidad',

    // Footer — Resources links
    'footer.blog': 'Blog',
    'footer.github': 'GitHub',

    // Footer — Company links
    'footer.about': 'Nosotros',
    'footer.contact': 'Contacto',
    'footer.pricing': 'Precios',
    'footer.security': 'Seguridad',
    'footer.whylra': 'Por qué LRA',
    'footer.bookConsultation': 'Reservar consulta',

    // Footer — brand / status
    'footer.tagline':
      'Infraestructura cloud, plataformas Kubernetes y automatización DevOps. Entornos AWS de producción construidos como código.',
    'footer.available': 'Disponible para nuevos proyectos',
    'footer.copyright': '© 2026 LRA Cloud Ops. Todos los derechos reservados.',
    'footer.edge': 'Cloudflare Edge Network',

    // Blog
    'blog.back': 'Volver al blog',
    'blog.contact': '¿Tienes preguntas? Contáctame',
    'blog.read': 'Leer',
    'blog.comingSoon': 'Artículos próximamente.',
    'blog.noResults': 'No hay artículos en esta categoría todavía.',
    'blog.categories.all': 'Todos',

    // Projects / Case Studies
    'projects.production': 'Producción',
    'projects.inDevelopment': 'En desarrollo',
    'projects.reference': 'Referencia',
    'projects.starter': 'Plantilla',

    // Shared CTAs
    'cta.getInTouch': 'Contáctame',
    'cta.viewCaseStudies': 'Ver casos de uso',
    'cta.viewOnGitHub': 'Ver en GitHub',
  },
} satisfies Record<Locale, Record<string, string>>
