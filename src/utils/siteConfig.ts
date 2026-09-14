import type { DefaultLanding } from './appMeta'
import type { Locale } from '../i18n/types'
import type { Course, CourseStatus, SelectedSection } from '../types'
import type { ProgrammeId } from '../programmes/types'
import {
  PROGRAMME_CATALOGUE,
  getCatalogueEntry,
  resolveProgrammeId,
  wishlistStorageKey,
  type ProgrammeCatalogueEntry,
} from '../programmes/catalogue'
import { TPG_PREFERRED_PROGRAMME_KEY } from '../session/tpgSession'
import { formatSectionInstructors } from './instructors'
import { teachingPlanNotices as msbaNotices } from '../programmes/msba/teachingPlanUpdates'
import type { TeachingPlanNotice } from '../programmes/msba/teachingPlanUpdates'
import { teachingPlanNotices as mgmNotices } from '../programmes/mgm/teachingPlanUpdates'

function teachingPlanDismissVersion(notice: TeachingPlanNotice): string {
  return notice.updates.map(u => u.courseCode).join('+')
}

/**
 * Site config schema 2.1 — nested packs with slim course rows (courseCode + sectionId + status).
 *
 * Compatibility (code only; not shown in UI):
 * - Accept BA schema **1.5** flat backups (slim rows; teachingPlanRead timestamps → true).
 * - Do **not** keep compatibility with tpghelper v2 nested full SelectedSection dumps or
 *   pre-1.5 BA v1 full-row shapes beyond what 1.5 already accepts (courseCode+sectionId).
 */
export const SITE_CONFIG_STORAGE_KEY = 'tpghelper-site-config'
export const SITE_CONFIG_SCHEMA_VERSION = 2.1 as const

/** Slim course row in backup JSON (catalog fields rehydrated on import). */
export interface UserDataCourseEntry {
  courseCode: string
  sectionId: string
  /**
   * Selections: `registered` | `waitlist` | `failed` (failed skipped on import).
   * Wishlist array rows use `wishlist` (BA 1.5), not enrollment waitlist.
   */
  status: string
}

export interface ProgrammeUserConfig {
  locale: Locale
  defaultLanding: DefaultLanding
  /** Dismissed notices: publish timestamp → true */
  teachingPlanRead: Record<string, true>
  selections: UserDataCourseEntry[]
  /** Wishlist (MSBA) or backup selections (MGM). */
  wishlist: UserDataCourseEntry[]
}

export interface SiteConfig {
  schemaVersion: typeof SITE_CONFIG_SCHEMA_VERSION
  exportedAt: string
  /** Active programme id — lander opens this path when set. */
  currentProgramme: ProgrammeId | null
  /** Omitted from export when the pack has no user data. */
  msba?: ProgrammeUserConfig
  mgm?: ProgrammeUserConfig
}

export const COURSE_STATUS_REGISTERED = 'registered' as const
export const COURSE_STATUS_WAITLIST = 'waitlist' as const
export const COURSE_STATUS_FAILED = 'failed' as const
/** Wishlist/backup list marker in export JSON (not an enrollment status). */
export const COURSE_STATUS_WISHLIST = 'wishlist' as const

const TIMESTAMP_KEY_RE = /^\d{4}\/\d{2}\/\d{2}/

function noticesFor(id: ProgrammeId): TeachingPlanNotice[] {
  return id === 'mgm' ? mgmNotices : msbaNotices
}

function dismissStorageKey(entryId: ProgrammeId, noticeId: string): string {
  const prefix = `${entryId}-dismiss-teaching-plan-notice`
  const legacyId = entryId === 'msba' ? '20260818-7015-7037' : ''
  return legacyId && noticeId === legacyId ? prefix : `${prefix}:${noticeId}`
}

function dismissKeyPrefix(entryId: ProgrammeId): string {
  return `${entryId}-dismiss-teaching-plan-notice`
}

function readJsonArray(key: string): unknown[] {
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

/** Map runtime selection row → export entry. */
export function toCourseEntry(
  s: Pick<SelectedSection, 'courseCode' | 'sectionId' | 'status'> | Record<string, unknown>,
  fallbackStatus: string,
): UserDataCourseEntry {
  const courseCode = String((s as { courseCode?: unknown }).courseCode ?? '').trim()
  const sectionId = String((s as { sectionId?: unknown }).sectionId ?? '').trim()
  const rawStatus = (s as { status?: unknown }).status
  const legacy = (s as { enrollmentStatus?: unknown }).enrollmentStatus
  let status =
    typeof rawStatus === 'string' && rawStatus.trim()
      ? rawStatus.trim()
      : typeof legacy === 'string' && legacy.trim()
        ? legacy.trim()
        : fallbackStatus
  if (status === 'waiting') status = COURSE_STATUS_WAITLIST
  return { courseCode, sectionId, status }
}

/** Export dismissed notices as `{ [timestamp]: true }`. */
function readTeachingPlanRead(entry: ProgrammeCatalogueEntry): Record<string, true> {
  const out: Record<string, true> = {}
  const prefix = dismissKeyPrefix(entry.id)
  const notices = noticesFor(entry.id)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      const value = localStorage.getItem(key)
      if (!value) continue
      const noticeId = key.includes(':') ? key.slice(key.indexOf(':') + 1) : (
        entry.id === 'msba' ? '20260818-7015-7037' : ''
      )
      const notice = notices.find(n => n.id === noticeId)
        ?? (key === prefix ? notices.find(n => n.id === '20260818-7015-7037') : undefined)
      if (!notice) continue
      if (teachingPlanDismissVersion(notice) === value) {
        out[notice.timestamp] = true
      }
    }
  } catch {
    /* ignore */
  }
  return out
}

function programmeHasUserData(pack: ProgrammeUserConfig): boolean {
  return (
    pack.selections.length > 0
    || pack.wishlist.length > 0
    || Object.keys(pack.teachingPlanRead).length > 0
  )
}

function readProgrammeUserConfig(entry: ProgrammeCatalogueEntry): ProgrammeUserConfig {
  const selectionsRaw = readJsonArray(entry.storage.selections)
  const wishlistRaw = readJsonArray(wishlistStorageKey(entry))
  return {
    locale: readLocale(entry.storage.locale),
    defaultLanding: readDefaultLanding(entry.storage.defaultLanding),
    teachingPlanRead: readTeachingPlanRead(entry),
    selections: selectionsRaw
      .map(row => toCourseEntry(row as Record<string, unknown>, COURSE_STATUS_REGISTERED))
      .filter(e => e.courseCode && e.sectionId && e.status !== COURSE_STATUS_FAILED),
    wishlist: wishlistRaw
      .map(row => {
        const e = toCourseEntry(row as Record<string, unknown>, COURSE_STATUS_WISHLIST)
        return { ...e, status: COURSE_STATUS_WISHLIST }
      })
      .filter(e => e.courseCode && e.sectionId),
  }
}

/**
 * Normalize teachingPlanRead into `{ [publishTimestamp]: true }`.
 * Accepts schema 1.5 timestamp keys, plus legacy noticeId → token maps (BA 1.5 importer).
 */
function normalizeTeachingPlanRead(
  raw: Record<string, unknown>,
  notices: TeachingPlanNotice[],
): Record<string, true> {
  const out: Record<string, true> = {}

  const markTimestamp = (ts: string) => {
    if (ts) out[ts] = true
  }

  for (const [key, value] of Object.entries(raw)) {
    if (TIMESTAMP_KEY_RE.test(key) || notices.some(n => n.timestamp === key)) {
      markTimestamp(key)
      continue
    }

    const byId = notices.find(n => n.id === key)
    if (byId) {
      markTimestamp(byId.timestamp)
      continue
    }

    if (typeof value === 'string' && value) {
      if (TIMESTAMP_KEY_RE.test(value) || notices.some(n => n.timestamp === value)) {
        markTimestamp(value)
        continue
      }
      const byVersion = notices.find(n => teachingPlanDismissVersion(n) === value)
      if (byVersion) markTimestamp(byVersion.timestamp)
    }

    if (value === true) {
      // bare true with unknown key — ignore unless already timestamp-shaped
    }
  }

  return out
}

function parseCourseEntry(value: unknown, defaultStatus: string): UserDataCourseEntry | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.courseCode !== 'string' || !v.courseCode.trim()) return null
  if (typeof v.sectionId !== 'string' || !v.sectionId.trim()) return null

  let status =
    typeof v.status === 'string' && v.status.trim()
      ? v.status.trim()
      : typeof v.enrollmentStatus === 'string' && v.enrollmentStatus.trim()
        ? v.enrollmentStatus.trim()
        : defaultStatus
  if (status === 'waiting') status = COURSE_STATUS_WAITLIST

  return {
    courseCode: v.courseCode.trim(),
    sectionId: v.sectionId.trim(),
    status,
  }
}

function sanitizeCourseList(value: unknown, defaultStatus: string): UserDataCourseEntry[] {
  if (!Array.isArray(value)) return []
  const out: UserDataCourseEntry[] = []
  for (const item of value) {
    const entry = parseCourseEntry(item, defaultStatus)
    if (!entry) continue
    // failed: reserved — do not import
    if (entry.status === COURSE_STATUS_FAILED) continue
    out.push(entry)
  }
  return out
}

function parseProgrammeUserConfig(
  raw: unknown,
  entryId: ProgrammeId,
): ProgrammeUserConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const locale = obj.locale
  if (locale !== 'zh-CN' && locale !== 'zh-HK' && locale !== 'en') return null
  const defaultLanding = obj.defaultLanding
  if (defaultLanding !== 'planner' && defaultLanding !== 'calendar') return null

  let teachingPlanRead: Record<string, true> = {}
  if (obj.teachingPlanRead != null) {
    if (typeof obj.teachingPlanRead !== 'object' || Array.isArray(obj.teachingPlanRead)) return null
    teachingPlanRead = normalizeTeachingPlanRead(
      obj.teachingPlanRead as Record<string, unknown>,
      noticesFor(entryId),
    )
  }

  return {
    locale,
    defaultLanding,
    teachingPlanRead,
    selections: sanitizeCourseList(obj.selections, COURSE_STATUS_REGISTERED),
    wishlist: sanitizeCourseList(obj.wishlist, COURSE_STATUS_WISHLIST).map(e => ({
      ...e,
      status: COURSE_STATUS_WISHLIST,
    })),
  }
}

/** Build live site config from localStorage (+ preferred programme). Empty packs omitted. */
export function buildSiteConfig(): SiteConfig {
  const current = resolveProgrammeId(readPreferredRaw())

  const config: SiteConfig = {
    schemaVersion: SITE_CONFIG_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    currentProgramme: current,
  }

  for (const entry of PROGRAMME_CATALOGUE) {
    const pack = readProgrammeUserConfig(entry)
    if (programmeHasUserData(pack)) {
      config[entry.id] = pack
    }
  }

  return config
}

export function siteConfigToJson(config: SiteConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`
}

export type ParseSiteConfigResult =
  | { ok: true; data: SiteConfig }
  | { ok: false; error: 'invalidJson' | 'invalidShape' }

/**
 * Parse schema 2.1 nested config, or promote a BA **1.5** flat backup.
 * (No dedicated support for legacy tpghelper v2 / pre-1.5 v1 dumps.)
 */
export function parseSiteConfigJson(text: string): ParseSiteConfigResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalidJson' }
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalidShape' }
  const obj = raw as Record<string, unknown>

  const looksNested =
    'currentProgramme' in obj
    || (obj.msba != null && typeof obj.msba === 'object')
    || (obj.mgm != null && typeof obj.mgm === 'object')

  if (looksNested) {
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
      const pack = parseProgrammeUserConfig(obj[entry.id], entry.id)
      if (!pack) return { ok: false, error: 'invalidShape' }
      config[entry.id] = pack
    }

    return { ok: true, data: config }
  }

  // BA 1.5 flat backup → nest under resolved programme id
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

  const pack = parseProgrammeUserConfig(
    {
      locale,
      defaultLanding,
      teachingPlanRead: obj.teachingPlanRead,
      selections: obj.selections,
      wishlist: obj.wishlist,
    },
    id,
  )
  if (!pack) return { ok: false, error: 'invalidShape' }

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

async function fetchCoursesCatalog(id: ProgrammeId): Promise<Course[]> {
  const base = id === 'mgm' ? '/mgm/' : '/msba/'
  const res = await fetch(`${base}courses.json`)
  if (!res.ok) throw new Error('coursesFetchFailed')
  const data: unknown = await res.json()
  return Array.isArray(data) ? (data as Course[]) : []
}

function hydrateCourseEntries(
  entries: UserDataCourseEntry[],
  courses: Course[],
  listKind: 'selections' | 'wishlist',
): SelectedSection[] {
  const byCode = new Map(courses.map(c => [c.courseCode, c]))
  const out: SelectedSection[] = []
  for (const entry of entries) {
    if (entry.status === COURSE_STATUS_FAILED) continue
    const course = byCode.get(entry.courseCode)
    if (!course) continue
    const section = course.sections.find(s => s.sectionId === entry.sectionId)
    if (!section) continue

    let status: CourseStatus = COURSE_STATUS_REGISTERED
    if (listKind === 'selections') {
      if (entry.status === COURSE_STATUS_WAITLIST || entry.status === 'waiting') {
        status = COURSE_STATUS_WAITLIST
      }
    }

    out.push({
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      module: course.module,
      courseType: course.courseType,
      sectionId: section.sectionId,
      instructor: formatSectionInstructors(section),
      status,
    })
  }
  return out
}

function applyTeachingPlanRead(entry: ProgrammeCatalogueEntry, map: Record<string, true>) {
  const prefix = dismissKeyPrefix(entry.id)
  const notices = noticesFor(entry.id)
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) toRemove.push(key)
    }
    for (const key of toRemove) localStorage.removeItem(key)

    for (const notice of notices) {
      if (map[notice.timestamp] !== true) continue
      const expected = teachingPlanDismissVersion(notice)
      if (!expected) continue
      localStorage.setItem(dismissStorageKey(entry.id, notice.id), expected)
    }
  } catch {
    /* ignore */
  }
}

async function applyProgrammeUserConfig(
  entry: ProgrammeCatalogueEntry,
  data: ProgrammeUserConfig,
): Promise<void> {
  const courses = await fetchCoursesCatalog(entry.id)
  const selections = hydrateCourseEntries(data.selections, courses, 'selections')
  const wishlist = hydrateCourseEntries(data.wishlist, courses, 'wishlist')

  localStorage.setItem(entry.storage.locale, data.locale)
  localStorage.setItem(entry.storage.defaultLanding, data.defaultLanding)
  localStorage.setItem(entry.storage.selections, JSON.stringify(selections))
  localStorage.setItem(wishlistStorageKey(entry), JSON.stringify(wishlist))
  applyTeachingPlanRead(entry, data.teachingPlanRead)
}

/** Write nested packs + currentProgramme into localStorage (hydrates slim rows via courses.json). */
export async function applySiteConfig(config: SiteConfig): Promise<void> {
  for (const entry of PROGRAMME_CATALOGUE) {
    const pack = config[entry.id]
    if (pack) await applyProgrammeUserConfig(entry, pack)
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
