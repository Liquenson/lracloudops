import { ui, defaultLocale, type Locale } from './ui'

/**
 * Extracts the locale from an Astro URL.
 *
 * When i18n routing is active, URLs look like:
 *   /           → 'en' (default, no prefix)
 *   /es/...     → 'es'
 *
 * Usage in .astro files:
 *   import { getLangFromUrl, useTranslations } from '../i18n'
 *   const lang = getLangFromUrl(Astro.url)
 *   const t = useTranslations(lang)
 *   <span>{t('nav.home')}</span>
 */
export function getLangFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/')
  if (maybeLocale === 'es') return 'es'
  return defaultLocale
}

/**
 * Returns a typed translation lookup function for the given locale.
 * Falls back to the default locale string when a key is missing.
 */
export function useTranslations(lang: Locale) {
  return function t(key: keyof (typeof ui)[typeof defaultLocale]): string {
    return ui[lang][key] ?? ui[defaultLocale][key] ?? key
  }
}

/**
 * Returns the alternate-locale version of a URL path.
 *
 * Used for <link rel="alternate" hreflang="..."> tags in the <head>.
 *
 * Example:
 *   getAlternateUrl('/blog/my-post', 'es') → '/es/blog/my-post'
 *   getAlternateUrl('/es/blog/mi-articulo', 'en') → '/blog/mi-articulo'
 */
export function getAlternateUrl(pathname: string, targetLang: Locale): string {
  if (targetLang === defaultLocale) {
    return pathname.replace(/^\/es/, '') || '/'
  }
  return `/${targetLang}${pathname}`
}

export { defaultLocale, type Locale }
