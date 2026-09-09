import { getActiveProgramme } from '../programmes'

export type Locale = 'zh-CN' | 'zh-HK' | 'en'

export const LOCALE_STORAGE_KEY = getActiveProgramme().storage.locale
export const DEFAULT_LOCALE: Locale = 'zh-CN'

export type TranslationValue = string | string[] | TranslationTree
export type TranslationTree = { [key: string]: TranslationValue }
