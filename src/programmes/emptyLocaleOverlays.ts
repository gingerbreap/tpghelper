import type { Locale, TranslationTree } from '../i18n/types'

/** No-op overlays for programmes that use shared base locales only (e.g. MSBA). */
export const programmeLocaleOverlays: Record<Locale, TranslationTree> = {
  'zh-CN': {},
  'zh-HK': {},
  en: {},
}
