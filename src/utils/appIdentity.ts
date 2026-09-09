import type { Locale } from '../i18n/types'

/** Home-screen / install short name (all locales). */
export const APP_SHORT_NAME = 'TPG Planner'

export function appLongName(locale: Locale): string {
  if (locale === 'zh-CN') return 'HKUBS TPG 选课助手'
  if (locale === 'zh-HK') return 'HKUBS TPG 選課助手'
  return 'HKUBS TPG Course Planner'
}

/** Manifest file under `public/` for the given UI locale. */
export function appManifestHref(locale: Locale): string {
  const base = import.meta.env.BASE_URL
  if (locale === 'zh-CN') return `${base}site.zh-CN.webmanifest`
  if (locale === 'zh-HK') return `${base}site.zh-HK.webmanifest`
  return `${base}site.webmanifest`
}

/** Keep `<link rel="manifest">` and apple web-app title in sync with locale. */
export function applyAppIdentity(locale: Locale): void {
  const short = APP_SHORT_NAME
  let apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (!apple) {
    apple = document.createElement('meta')
    apple.setAttribute('name', 'apple-mobile-web-app-title')
    document.head.appendChild(apple)
  }
  apple.setAttribute('content', short)

  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  link.href = appManifestHref(locale)
}

/** Detect UI locale from browser/OS language when nothing is stored yet. */
export function detectSystemLocale(): Locale {
  const candidates: string[] = []
  try {
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages)
      if (navigator.language) candidates.push(navigator.language)
    }
  } catch {
    /* ignore */
  }

  for (const raw of candidates) {
    const tag = raw.toLowerCase().replace(/_/g, '-')
    if (
      tag === 'zh-hk'
      || tag === 'zh-tw'
      || tag === 'zh-mo'
      || tag.startsWith('zh-hant')
    ) {
      return 'zh-HK'
    }
    if (
      tag === 'zh'
      || tag === 'zh-cn'
      || tag === 'zh-sg'
      || tag.startsWith('zh-hans')
    ) {
      return 'zh-CN'
    }
  }
  return 'en'
}
