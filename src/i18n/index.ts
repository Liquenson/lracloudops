import { ui } from './ui'

export const languages = {
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr', region: 'Americas' },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr', region: 'Americas' },
  'pt-br': { name: 'Português (BR)', flag: '🇧🇷', dir: 'ltr', region: 'Americas' },
  de: { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr', region: 'Europe' },
  fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr', region: 'Europe' },
  it: { name: 'Italiano', flag: '🇮🇹', dir: 'ltr', region: 'Europe' },
  ja: { name: '日本語', flag: '🇯🇵', dir: 'ltr', region: 'Asia Pacific' },
  ko: { name: '한국어', flag: '🇰🇷', dir: 'ltr', region: 'Asia Pacific' },
  'zh-cn': { name: '中文(简体)', flag: '🇨🇳', dir: 'ltr', region: 'Asia Pacific' },
} as const

export type Locale = keyof typeof languages
export const defaultLocale: Locale = 'en'
export const localeList = Object.keys(languages) as Locale[]

export const regions = {
  'Americas': ['en', 'es', 'pt-br'] as const,
  'Europe': ['de', 'fr', 'it'] as const,
  'Asia Pacific': ['ja', 'ko', 'zh-cn'] as const,
} as const

export function getLangFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/')
  if (maybeLocale in languages) return maybeLocale as Locale
  return defaultLocale
}

export async function getTranslations(locale: Locale): Promise<Record<string, Record<string, string>>> {
  try {
    const mod = await import(`./locales/${locale}.json`)
    return mod.default as Record<string, Record<string, string>>
  } catch {
    const mod = await import('./locales/en.json')
    return mod.default as Record<string, Record<string, string>>
  }
}

/** Smart alternate URL for EN↔ES paths (handles /es/nosotros → /about etc.) */
const _enToEs: Record<string, string> = {
  '/': '/es',
  '/services': '/es/servicios',
  '/about': '/es/nosotros',
  '/contact': '/es/contacto',
  '/pricing': '/es/pricing',
  '/projects': '/es/proyectos',
  '/blog': '/es/blog',
  '/resources': '/es/resources',
  '/open-source': '/es/open-source',
  '/security': '/es/security',
  '/why-lra': '/es/why-lra',
}

/** Returns the English base path for any given URL pathname. */
function getEnPath(pathname: string): string {
  if (!pathname.startsWith('/es')) return pathname
  const fromEs = Object.entries(_enToEs).find(([, v]) => v === pathname)
  if (fromEs) return fromEs[0]
  if (pathname === '/es') return '/'
  return pathname.slice(3) || '/'
}

/** Returns the alternate URL for any target locale. */
export function getAlternateUrl(url: URL, targetLocale: Locale): string {
  const enPath = getEnPath(url.pathname)
  if (targetLocale === 'en') return enPath
  if (targetLocale === 'es') return _enToEs[enPath] ?? '/es' + enPath
  return enPath === '/' ? `/${targetLocale}/` : `/${targetLocale}${enPath}`
}

export function getHreflangTags(url: URL): Array<{ locale: string; href: string }> {
  return localeList.map((locale) => ({
    locale: locale === 'zh-cn' ? 'zh-Hans' : locale,
    href: `https://lracloudops.com${getAlternateUrl(url, locale)}`,
  }))
}

/** Kept for backward compatibility — use getTranslations() for new locale pages. */
export function useTranslations(lang: 'en' | 'es') {
  return function t(key: keyof (typeof ui)['en']): string {
    const safeLang = lang === 'es' ? 'es' : 'en'
    return ui[safeLang][key] ?? ui['en'][key] ?? key
  }
}
