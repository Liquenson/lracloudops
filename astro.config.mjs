import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lracloudops.com',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
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
        if (url === 'https://lracloudops.com/' || url === 'https://lracloudops.com/es') {
          item.priority = 1.0
        } else if (
          url.includes('/services') ||
          url.includes('/solutions') ||
          url.includes('/pricing')
        ) {
          item.priority = 0.9
        } else if (
          url.includes('/about') ||
          url.includes('/contact') ||
          url.includes('/nosotros') ||
          url.includes('/contacto') ||
          url.includes('/why-lra') ||
          url.includes('/security')
        ) {
          item.priority = 0.8
        } else if (
          url.includes('/blog/') ||
          url.includes('/projects/')
        ) {
          item.priority = 0.7
        }
        return item
      },
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          es: 'es-ES',
        },
      },
    }),
  ],
});
