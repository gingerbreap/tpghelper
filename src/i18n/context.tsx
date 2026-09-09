import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import zhCN from './locales/zh-CN'
import zhHK from './locales/zh-HK'
import en from './locales/en'
import { interpolate, resolveTranslation } from './resolve'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, type TranslationTree, type TranslationValue } from './types'
import { getActiveProgramme } from '../programmes'
import mgmEn from '../programmes/mgm/locales/en'
import mgmZhCN from '../programmes/mgm/locales/zh-CN'
import mgmZhHK from '../programmes/mgm/locales/zh-HK'

function deepMerge(base: TranslationTree, overlay: TranslationTree): TranslationTree {
  const out: TranslationTree = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    const existing = out[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(existing, value)
    } else {
      out[key] = value
    }
  }
  return out
}

const BASE_LOCALES: Record<Locale, TranslationTree> = {
  'zh-CN': zhCN,
  'zh-HK': zhHK,
  en,
}

const MGM_OVERLAYS: Record<Locale, TranslationTree> = {
  'zh-CN': mgmZhCN,
  'zh-HK': mgmZhHK,
  en: mgmEn,
}

function buildLocales(): Record<Locale, TranslationTree> {
  if (getActiveProgramme().id !== 'mgm') return BASE_LOCALES
  return {
    'zh-CN': deepMerge(BASE_LOCALES['zh-CN'], MGM_OVERLAYS['zh-CN']),
    'zh-HK': deepMerge(BASE_LOCALES['zh-HK'], MGM_OVERLAYS['zh-HK']),
    en: deepMerge(BASE_LOCALES.en, MGM_OVERLAYS.en),
  }
}

const LOCALES = buildLocales()

const HTML_LANG: Record<Locale, string> = {
  'zh-CN': 'zh-CN',
  'zh-HK': 'zh-HK',
  en: 'en',
}

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  tList: (key: string) => string[]
  sectionLabel: (sectionId: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

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

export function I18nProvider({ children }: { children: ReactNode }) {
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

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const value = resolveTranslation(messages, key)
    return interpolate(toStringValue(value, key), vars)
  }, [messages])

  const tList = useCallback((key: string) => {
    const value = resolveTranslation(messages, key)
    return Array.isArray(value) ? value.map(String) : []
  }, [messages])

  const sectionLabel = useCallback((sectionId: string) => {
    return t('common.sectionClass', { section: sectionId })
  }, [t])

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale]
    document.title = t('meta.title')
  }, [locale, t])

  const value = useMemo(
    () => ({ locale, setLocale, t, tList, sectionLabel }),
    [locale, setLocale, t, tList, sectionLabel],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export function formatSectionText(
  t: I18nContextValue['t'],
  courseCode: string,
  sectionId: string,
): string {
  return t('conflicts.sectionFormat', { code: courseCode, section: sectionId })
}

export function formatSectionWithTypeText(
  t: I18nContextValue['t'],
  courseCode: string,
  sectionId: string,
  sessionType: 'lecture' | 'tutorial',
): string {
  const type = sessionType === 'lecture' ? 'LEC' : 'TUT'
  return t('conflicts.sectionWithType', { code: courseCode, section: sectionId, type })
}
