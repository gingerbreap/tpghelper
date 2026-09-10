import type { DefaultLanding } from './appMeta'
import type { Locale } from '../i18n/types'
import type { SelectedSection } from '../types'
import type { ProgrammeId } from '../programmes/types'
import {
  PROGRAMME_CATALOGUE,
  getCatalogueEntry,
  resolveProgrammeId,
  wishlistStorageKey,
  type ProgrammeCatalogueEntry,
} from '../programmes/catalogue'
import { TPG_PREFERRED_PROGRAMME_KEY } from '../session/tpgSession'

/** Unified site config (export / localStorage). */
export const SITE_CONFIG_STORAGE_KEY = 'tpghelper-site-config'
export const SITE_CONFIG_SCHEMA_VERSION = 2 as const

export interface ProgrammeUserConfig {
  locale: Locale
  defaultLanding: DefaultLanding
  teachingPlanRead: Record<string, string>
  selections: SelectedSection[]
  /** Wishlist (MSBA) or backup selections (MGM). */
  wishlist: SelectedSection[]
}

export interface SiteConfig {
  schemaVersion: typeof SITE_CONFIG_SCHEMA_VERSION
  exportedAt: string
  /** Active programme id — lander opens this path when set. */
  currentProgramme: ProgrammeId | null
  msba?: ProgrammeUserConfig
  mgm?: ProgrammeUserConfig
}

function isSelectedSection(value: unknown): value is SelectedSection {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.courseCode === 'string'
    && typeof v.courseTitle === 'string'
    && typeof v.module === 'number'
    && typeof v.courseType === 'string'
    && typeof v.sectionId === 'string'
    && typeof v.instructor === 'string'
  )
}

function sanitizeCourseList(value: unknown): SelectedSection[] {
  if (!Array.isArray(value)) return []
  return value.filter(isSelectedSection)
}

function readJsonArray(key: string): SelectedSection[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readLocale(key: string): Locale {
  try {
    const stored = localStorage.getItem(key)
    if (stored === 'zh-CN' || stored === 'zh-HK' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return 'zh-CN'
}

function readDefaultLanding(key: string): DefaultLanding {
  try {
    return localStorage.getItem(key) === 'calendar' ? 'calendar' : 'planner'
  } catch {
    return 'planner'
  }
}

function readPreferredRaw(): string | null {
  try {
    return localStorage.getItem(TPG_PREFERRED_PROGRAMME_KEY)
  } catch {
    return null
  }
}

function writePreferred(id: ProgrammeId) {
  try {
    localStorage.setItem(TPG_PREFERRED_PROGRAMME_KEY, id)
  } catch {
    /* ignore */
  }
}

/** Best-effort: collect dismiss keys written by either pack. */
function readTeachingPlanRead(entry: ProgrammeCatalogueEntry): Record<string, string> {
  const out: Record<string, string> = {}
  const prefix = `${entry.id}-dismiss-teaching-plan`
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      const value = localStorage.getItem(key)
      if (!value) continue
      const noticeId = key.includes(':') ? key.slice(key.indexOf(':') + 1) : key
      out[noticeId] = value
    }
  } catch {
    /* ignore */
  }
  return out
}

function readProgrammeUserConfig(entry: ProgrammeCatalogueEntry): ProgrammeUserConfig {
  return {
    locale: readLocale(entry.storage.locale),
    defaultLanding: readDefaultLanding(entry.storage.defaultLanding),
    teachingPlanRead: readTeachingPlanRead(entry),
    selections: readJsonArray(entry.storage.selections),
    wishlist: readJsonArray(wishlistStorageKey(entry)),
  }
}

function applyTeachingPlanRead(entry: ProgrammeCatalogueEntry, map: Record<string, string>) {
  const prefix = `${entry.id}-dismiss-teaching-plan`
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) toRemove.push(key)
    }
    for (const key of toRemove) localStorage.removeItem(key)

    for (const [noticeId, version] of Object.entries(map)) {
      if (!noticeId || !version) continue
      const key = noticeId.startsWith(prefix) ? noticeId : `${prefix}:${noticeId}`
      localStorage.setItem(key, version)
    }
  } catch {
    /* ignore */
  }
}

function applyProgrammeUserConfig(entry: ProgrammeCatalogueEntry, data: ProgrammeUserConfig) {
  localStorage.setItem(entry.storage.locale, data.locale)
  localStorage.setItem(entry.storage.defaultLanding, data.defaultLanding)
  localStorage.setItem(entry.storage.selections, JSON.stringify(data.selections))
  localStorage.setItem(wishlistStorageKey(entry), JSON.stringify(data.wishlist))
  applyTeachingPlanRead(entry, data.teachingPlanRead)
}

function parseProgrammeUserConfig(raw: unknown): ProgrammeUserConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const locale = obj.locale
  if (locale !== 'zh-CN' && locale !== 'zh-HK' && locale !== 'en') return null
  const defaultLanding = obj.defaultLanding
  if (defaultLanding !== 'planner' && defaultLanding !== 'calendar') return null

  const teachingPlanRead: Record<string, string> = {}
  if (obj.teachingPlanRead != null) {
    if (typeof obj.teachingPlanRead !== 'object' || Array.isArray(obj.teachingPlanRead)) return null
    for (const [id, version] of Object.entries(obj.teachingPlanRead as Record<string, unknown>)) {
      if (typeof version === 'string' && version) teachingPlanRead[id] = version
    }
  }

  return {
    locale,
    defaultLanding,
    teachingPlanRead,
    selections: sanitizeCourseList(obj.selections),
    wishlist: sanitizeCourseList(obj.wishlist),
  }
}

/** Build live site config from localStorage (+ preferred programme). */
export function buildSiteConfig(): SiteConfig {
  const current = resolveProgrammeId(readPreferredRaw())

  const config: SiteConfig = {
    schemaVersion: SITE_CONFIG_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    currentProgramme: current,
  }

  for (const entry of PROGRAMME_CATALOGUE) {
    config[entry.id] = readProgrammeUserConfig(entry)
  }

  return config
}

export function siteConfigToJson(config: SiteConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`
}

export type ParseSiteConfigResult =
  | { ok: true; data: SiteConfig }
  | { ok: false; error: 'invalidJson' | 'invalidShape' }

/** Parse v2 site config, or promote a v1 single-programme backup. */
export function parseSiteConfigJson(text: string): ParseSiteConfigResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalidJson' }
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalidShape' }
  const obj = raw as Record<string, unknown>

  const looksV2 =
    'currentProgramme' in obj
    || (obj.msba != null && typeof obj.msba === 'object')
    || (obj.mgm != null && typeof obj.mgm === 'object')

  if (looksV2) {
    let currentProgramme: ProgrammeId | null = null
    if (obj.currentProgramme != null && obj.currentProgramme !== '') {
      if (typeof obj.currentProgramme !== 'string') return { ok: false, error: 'invalidShape' }
      currentProgramme = resolveProgrammeId(obj.currentProgramme)
      if (!currentProgramme) return { ok: false, error: 'invalidShape' }
    }

    const config: SiteConfig = {
      schemaVersion: SITE_CONFIG_SCHEMA_VERSION,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      currentProgramme,
    }

    for (const entry of PROGRAMME_CATALOGUE) {
      if (!(entry.id in obj) || obj[entry.id] == null) continue
      const pack = parseProgrammeUserConfig(obj[entry.id])
      if (!pack) return { ok: false, error: 'invalidShape' }
      config[entry.id] = pack
    }

    return { ok: true, data: config }
  }

  // v1 flat backup → nest under resolved programme id
  const locale = obj.locale
  if (locale !== 'zh-CN' && locale !== 'zh-HK' && locale !== 'en') {
    return { ok: false, error: 'invalidShape' }
  }
  const defaultLanding = obj.defaultLanding
  if (defaultLanding !== 'planner' && defaultLanding !== 'calendar') {
    return { ok: false, error: 'invalidShape' }
  }
  if (typeof obj.programme !== 'string' || !obj.programme.trim()) {
    return { ok: false, error: 'invalidShape' }
  }

  const id = resolveProgrammeId(obj.programme)
  if (!id) return { ok: false, error: 'invalidShape' }

  const teachingPlanRead: Record<string, string> = {}
  if (obj.teachingPlanRead != null) {
    if (typeof obj.teachingPlanRead !== 'object' || Array.isArray(obj.teachingPlanRead)) {
      return { ok: false, error: 'invalidShape' }
    }
    for (const [nid, version] of Object.entries(obj.teachingPlanRead as Record<string, unknown>)) {
      if (typeof version === 'string' && version) teachingPlanRead[nid] = version
    }
  }

  const pack: ProgrammeUserConfig = {
    locale,
    defaultLanding,
    teachingPlanRead,
    selections: sanitizeCourseList(obj.selections),
    wishlist: sanitizeCourseList(obj.wishlist),
  }

  return {
    ok: true,
    data: {
      schemaVersion: SITE_CONFIG_SCHEMA_VERSION,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      currentProgramme: id,
      [id]: pack,
    },
  }
}

/** Write nested packs + currentProgramme into localStorage. */
export function applySiteConfig(config: SiteConfig): void {
  for (const entry of PROGRAMME_CATALOGUE) {
    const pack = config[entry.id]
    if (pack) applyProgrammeUserConfig(entry, pack)
  }

  if (config.currentProgramme) {
    writePreferred(config.currentProgramme)
  }

  try {
    localStorage.setItem(SITE_CONFIG_STORAGE_KEY, siteConfigToJson(buildSiteConfig()))
  } catch {
    /* ignore */
  }
}

/** Persist currentProgramme (and refresh nested snapshot) for open-redirect. */
export function syncCurrentProgramme(id: ProgrammeId | string): void {
  const resolved = resolveProgrammeId(id)
  if (!resolved) return
  writePreferred(resolved)
  try {
    const live = buildSiteConfig()
    live.currentProgramme = resolved
    localStorage.setItem(SITE_CONFIG_STORAGE_KEY, siteConfigToJson(live))
  } catch {
    /* ignore */
  }
}

export function readStoredSiteConfig(): SiteConfig | null {
  try {
    const raw = localStorage.getItem(SITE_CONFIG_STORAGE_KEY)
    if (!raw) return null
    const parsed = parseSiteConfigJson(raw)
    return parsed.ok ? parsed.data : null
  } catch {
    return null
  }
}

/** Prefer site config currentProgramme, then legacy preferred key. */
export function resolveOpenProgrammeId(): ProgrammeId | null {
  const stored = readStoredSiteConfig()
  if (stored?.currentProgramme) return stored.currentProgramme
  return resolveProgrammeId(readPreferredRaw())
}

export function getProgrammeShortName(id: ProgrammeId): string {
  return getCatalogueEntry(id)?.shortName ?? id
}
