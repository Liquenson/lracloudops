import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lracloudops.com',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'de', 'fr', 'it', 'pt-br', 'ja', 'ko', 'zh-cn'],
    routing: {
      prefixDefaultLocale: false,
    },
    fallback: {
      'de': 'en',
      'fr': 'en',
      'it': 'en',
      'pt-br': 'en',
      'ja': 'en',
      'ko': 'en',
      'zh-cn': 'en',
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
        if (path === '/' || path === '/es' || path === '/es/') {
          item.priority = 1.0
        } else if (
          /^\/(services|pricing|assessment)\/?$/.test(path) ||
          /^\/es\/(servicios|pricing|assessment)\/?$/.test(path)
        ) {
          item.priority = 0.9
        } else if (
          /^\/(about|contact|certifications|why-lra|projects|blog|resources)\/?$/.test(path) ||
          /^\/es\/(nosotros|contacto|certifications|proyectos|blog|resources)\/?$/.test(path)
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
          /^\/es\/(security|privacy|terms)\/?$/.test(path)
        ) {
          item.priority = 0.5
        }
        return item
      },
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          es: 'es-ES',
          de: 'de-DE',
          fr: 'fr-FR',
          it: 'it-IT',
          'pt-br': 'pt-BR',
          ja: 'ja-JP',
          ko: 'ko-KR',
          'zh-cn': 'zh-CN',
        },
      },
    }),
  ],
});
