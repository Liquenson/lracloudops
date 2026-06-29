export const languages = {
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr', region: 'main' },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr', region: 'main' },
} as const

export type Locale = keyof typeof languages
export const defaultLocale: Locale = 'en'
export const localeList = Object.keys(languages) as Locale[]

export const regions = {
  Languages: ['en', 'es'],
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
    const en = await import('./locales/en.json')
    return en.default
  }
}

/** Returns the alternate URL for any target locale. */
export function getAlternateUrl(url: URL, targetLocale: Locale): string {
  const [, currentLang, ...rest] = url.pathname.split('/')
  const isCurrentLangValid = currentLang in languages
  const pathParts = isCurrentLangValid ? rest : [currentLang, ...rest]
  const path = pathParts.filter(Boolean).join('/')
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

/** Kept for backward compatibility */
export function useTranslations(lang: 'en' | 'es') {
  return function t(key: string): string {
    return key
  }
}
