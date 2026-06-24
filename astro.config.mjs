import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lracloudops.com',

  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
    fallback: {
      'en': 'es',
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        const url = item.url
        const path = url.replace('https://lracloudops.com', '')
        if (path === '/') {
          item.priority = 1.0
        } else if (
          /^\/(servicios|pricing|assessment)\/?$/.test(path) ||
          /^\/en\/(services|pricing|assessment)\/?$/.test(path)
        ) {
          item.priority = 0.9
        } else if (
          /^\/(nosotros|contacto|certifications|proyectos|blog|resources)\/?$/.test(path) ||
          /^\/en\/(about|contact|certifications|projects|blog|resources)\/?$/.test(path)
        ) {
          item.priority = 0.8
        } else if (
          url.includes('/blog/') ||
          url.includes('/projects/') ||
          url.includes('/solutions/') ||
          url.includes('/industries/')
        ) {
          item.priority = 0.7
        } else if (
          /^\/(security|privacy|terms)\/?$/.test(path) ||
          /^\/en\/(security|privacy|terms)\/?$/.test(path)
        ) {
          item.priority = 0.5
        }
        return item
      },
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es-ES',
          en: 'en-US',
        },
      },
    }),
  ],
});
