/** Site-wide appearance preference (MWG dark-mode-toggle). */

export const COLOR_SCHEME_STORAGE_KEY = 'tpghelper-color-scheme'
/** Same-document sync (storage event only fires across tabs). */
export const COLOR_SCHEME_CHANGE_EVENT = 'tpghelper-color-scheme-change'

export type ColorSchemePreference = 'system' | 'light' | 'dark'
export type RenderedScheme = 'light' | 'dark'

const META_NAME = 'color-scheme'

function notifyColorSchemeChange(): void {
  window.dispatchEvent(new Event(COLOR_SCHEME_CHANGE_EVENT))
}

export function getColorSchemePreference(): ColorSchemePreference {
  try {
    const raw = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
  } catch {
    /* ignore */
  }
  return 'system'
}

export function preferenceToMetaContent(pref: ColorSchemePreference): string {
  if (pref === 'light') return 'light'
  if (pref === 'dark') return 'dark'
  return 'light dark'
}

export function metaContentToPreference(content: string | null | undefined): ColorSchemePreference {
  const c = (content || '').trim()
  if (c === 'light') return 'light'
  if (c === 'dark') return 'dark'
  return 'system'
}

export function getColorSchemeMeta(): HTMLMetaElement | null {
  return document.querySelector(`meta[name="${META_NAME}"]`)
}

export function applyColorSchemeToDocument(pref: ColorSchemePreference = getColorSchemePreference()): void {
  const meta = getColorSchemeMeta()
  if (!meta) return
  meta.content = preferenceToMetaContent(pref)
}

export function setColorSchemePreference(pref: ColorSchemePreference): void {
  try {
    if (pref === 'system') localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY)
    else localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, pref)
  } catch {
    /* ignore */
  }
  applyColorSchemeToDocument(pref)
  notifyColorSchemeChange()
}

export function cycleColorScheme(
  current: ColorSchemePreference = getColorSchemePreference(),
): ColorSchemePreference {
  const order: ColorSchemePreference[] = ['system', 'light', 'dark']
  const next = order[(order.indexOf(current) + 1) % order.length]
  setColorSchemePreference(next)
  return next
}

/** Currently painted scheme (pinned override, else OS). */
export function resolveRenderedScheme(
  pref: ColorSchemePreference = getColorSchemePreference(),
): RenderedScheme {
  if (pref === 'light' || pref === 'dark') return pref
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function subscribeSystemScheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => onChange()
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

export function subscribeColorSchemeStorage(onChange: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === COLOR_SCHEME_STORAGE_KEY || event.key === null) {
      applyColorSchemeToDocument()
      onChange()
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

/** Same-tab + cross-tab preference changes. */
export function subscribeColorSchemeChange(onChange: () => void): () => void {
  const onLocal = () => onChange()
  window.addEventListener(COLOR_SCHEME_CHANGE_EVENT, onLocal)
  const unsubStorage = subscribeColorSchemeStorage(onChange)
  return () => {
    window.removeEventListener(COLOR_SCHEME_CHANGE_EVENT, onLocal)
    unsubStorage()
  }
}
