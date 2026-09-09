import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import zhCN from './locales/zh-CN'
import zhHK from './locales/zh-HK'
import en from './locales/en'
import { interpolate, resolveTranslation } from './resolve'
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  type Locale,
  type TranslationTree,
  type TranslationValue,
} from './types'

const LOCALES: Record<Locale, TranslationTree> = {
  'zh-CN': zhCN,
  'zh-HK': zhHK,
  en,
}

const HTML_LANG: Record<Locale, string> = {
  'zh-CN': 'zh-CN',
  'zh-HK': 'zh-HK',
  en: 'en',
}

export interface LanderI18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanderI18nContext = createContext<LanderI18nContextValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'en' || stored === 'zh-CN' || stored === 'zh-HK') return stored
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE
}

function toStringValue(value: TranslationValue | undefined, key: string): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join('\n')
  return key
}

export function LanderI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)
  const messages = LOCALES[locale]

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = toStringValue(resolveTranslation(messages, key), key)
      return interpolate(raw, vars)
    },
    [messages],
  )

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale]
    document.title = LOCALES[locale].brand
      ? toStringValue(resolveTranslation(LOCALES[locale], 'brand.name'), 'HKU TPg Course Planner')
      : 'HKU TPg Course Planner'
  }, [locale])

  return (
    <LanderI18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanderI18nContext.Provider>
  )
}

export function useLanderI18n(): LanderI18nContextValue {
  const ctx = useContext(LanderI18nContext)
  if (!ctx) throw new Error('useLanderI18n must be used within LanderI18nProvider')
  return ctx
}
