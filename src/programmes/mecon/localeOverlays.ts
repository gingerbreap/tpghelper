import type { Locale, TranslationTree } from '../../i18n/types'
import en from './locales/en'
import zhCN from './locales/zh-CN'
import zhHK from './locales/zh-HK'

export const programmeLocaleOverlays: Record<Locale, TranslationTree> = {
  'zh-CN': zhCN,
  'zh-HK': zhHK,
  en,
}
