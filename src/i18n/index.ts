export const languages = {
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr', region: 'Americas' },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr', region: 'Americas' },
} as const

export type Locale = keyof typeof languages
export const defaultLocale: Locale = 'es'
export const localeList = Object.keys(languages) as Locale[]

export const regions = {
  Americas: ['es', 'en'],
} as const

export function getLangFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/')
  if (lang in languages) return lang as Locale
  return defaultLocale
}

export async function getTranslations(locale: Locale) {
  try {
    const translations = await import(`./locales/${locale}.json`)
    return translations.default
  } catch {
    const es = await import('./locales/es.json')
    return es.default
  }
}

// ES (default) slugs that differ from their EN equivalents
const ES_TO_EN_SLUG: Record<string, string> = {
  servicios: 'services',
  nosotros: 'about',
  proyectos: 'projects',
  contacto: 'contact',
  metodologia: 'methodology',
}
const EN_TO_ES_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(ES_TO_EN_SLUG).map(([es, en]) => [en, es])
)

/** Returns the alternate URL for any target locale. */
export function getAlternateUrl(url: URL, targetLocale: Locale): string {
  const [, currentLang, ...rest] = url.pathname.split('/')
  const isCurrentLangValid = currentLang in languages
  const pathParts = isCurrentLangValid ? rest : [currentLang, ...rest]
  const firstSlug = pathParts[0] || ''
  const restSlugs = pathParts.slice(1)

  let translatedFirst = firstSlug
  const fromEs = !isCurrentLangValid || currentLang === defaultLocale
  const fromEn = isCurrentLangValid && currentLang === 'en'

  if (targetLocale === 'en' && fromEs && ES_TO_EN_SLUG[firstSlug]) {
    translatedFirst = ES_TO_EN_SLUG[firstSlug]
  } else if (
    targetLocale === defaultLocale &&
    fromEn &&
    EN_TO_ES_SLUG[firstSlug]
  ) {
    translatedFirst = EN_TO_ES_SLUG[firstSlug]
  }

  const allParts = [translatedFirst, ...restSlugs].filter(Boolean)
  const path = allParts.join('/')

  if (targetLocale === defaultLocale) return path ? `/${path}` : '/'
  return path ? `/${targetLocale}/${path}` : `/${targetLocale}/`
}

export function getHreflangTags(
  url: URL
): Array<{ locale: string; href: string }> {
  return localeList.map((locale) => ({
    locale,
    href: `https://lracloudops.com${getAlternateUrl(url, locale)}`,
  }))
}
