import { DEFAULT_LANDING_STORAGE_KEY, type DefaultLanding } from './appMeta'
import { SELECTIONS_STORAGE_KEY } from '../hooks/useSelections'
import { WISHLIST_STORAGE_KEY } from '../hooks/useWishlist'
import { LOCALE_STORAGE_KEY, type Locale } from '../i18n/types'
import { getActiveProgramme } from '../programmes'
import {
  teachingPlanDismissEventName,
  teachingPlanDismissStorageKey,
  teachingPlanDismissVersion,
} from './teachingPlanDismiss'
import { teachingPlanNotices } from '../data/teachingPlanUpdates'
import type { SelectedSection } from '../types'

/** Stable programme label for this planner (专业名). */
export function plannerProgrammeName(): string {
  return getActiveProgramme().shortName
}

/** @deprecated Prefer plannerProgrammeName() — kept for backups that hard-code MSc(BA). */
export const PLANNER_PROGRAMME = 'MSc(BA)' as const

export const USER_DATA_SCHEMA_VERSION = 1 as const

export interface UserDataSnapshot {
  schemaVersion: typeof USER_DATA_SCHEMA_VERSION
  exportedAt: string
  /** Programme / major name this backup belongs to */
  programme: typeof PLANNER_PROGRAMME | string
  locale: Locale
  defaultLanding: DefaultLanding
  /**
   * Teaching Plan notices marked read: noticeId → dismiss version string.
   * Only includes notices that were dismissed at export time.
   */
  teachingPlanRead: Record<string, string>
  /** Selected courses, preserved order */
  selections: SelectedSection[]
  /** Wishlist / backup courses, preserved order */
  wishlist: SelectedSection[]
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

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'zh-CN' || stored === 'zh-HK' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return 'zh-CN'
}

function readDefaultLanding(): DefaultLanding {
  try {
    return localStorage.getItem(DEFAULT_LANDING_STORAGE_KEY) === 'calendar'
      ? 'calendar'
      : 'planner'
  } catch {
    return 'planner'
  }
}

function readTeachingPlanRead(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const notice of teachingPlanNotices) {
    const version = teachingPlanDismissVersion(notice)
    if (!version) continue
    try {
      const stored = localStorage.getItem(teachingPlanDismissStorageKey(notice.id))
      if (stored === version) out[notice.id] = version
    } catch {
      /* ignore */
    }
  }
  return out
}

export function buildUserDataSnapshot(): UserDataSnapshot {
  return {
    schemaVersion: USER_DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    programme: plannerProgrammeName(),
    locale: readLocale(),
    defaultLanding: readDefaultLanding(),
    teachingPlanRead: readTeachingPlanRead(),
    selections: readJsonArray(SELECTIONS_STORAGE_KEY),
    wishlist: readJsonArray(WISHLIST_STORAGE_KEY),
  }
}

export function snapshotToJson(snapshot: UserDataSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`
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

export type ParseUserDataResult =
  | { ok: true; data: UserDataSnapshot }
  | { ok: false; error: 'invalidJson' | 'invalidShape' }

export function parseUserDataJson(text: string): ParseUserDataResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalidJson' }
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalidShape' }
  const obj = raw as Record<string, unknown>

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

  const teachingPlanRead: Record<string, string> = {}
  if (obj.teachingPlanRead != null) {
    if (typeof obj.teachingPlanRead !== 'object' || Array.isArray(obj.teachingPlanRead)) {
      return { ok: false, error: 'invalidShape' }
    }
    for (const [id, version] of Object.entries(obj.teachingPlanRead as Record<string, unknown>)) {
      if (typeof version === 'string' && version) teachingPlanRead[id] = version
    }
  }

  return {
    ok: true,
    data: {
      schemaVersion: USER_DATA_SCHEMA_VERSION,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      programme: obj.programme.trim(),
      locale,
      defaultLanding,
      teachingPlanRead,
      selections: sanitizeCourseList(obj.selections),
      wishlist: sanitizeCourseList(obj.wishlist),
    },
  }
}

/** Apply snapshot to localStorage and notify Teaching Plan dismiss listeners. */
export function applyUserDataSnapshot(data: UserDataSnapshot): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, data.locale)
  localStorage.setItem(DEFAULT_LANDING_STORAGE_KEY, data.defaultLanding)
  localStorage.setItem(SELECTIONS_STORAGE_KEY, JSON.stringify(data.selections))
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(data.wishlist))

  for (const notice of teachingPlanNotices) {
    const key = teachingPlanDismissStorageKey(notice.id)
    const nextVersion = data.teachingPlanRead[notice.id]
    const expected = teachingPlanDismissVersion(notice)
    try {
      if (nextVersion && expected && nextVersion === expected) {
        localStorage.setItem(key, nextVersion)
      } else {
        localStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(teachingPlanDismissEventName(notice.id)))
  }
}

export function downloadJsonFile(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function defaultExportFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const id = getActiveProgramme().id
  return `${id}-planner-backup-${y}${m}${d}.json`
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

export async function readTextFromClipboard(): Promise<string> {
  if (navigator.clipboard?.readText) {
    return navigator.clipboard.readText()
  }
  throw new Error('clipboardUnavailable')
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('readFailed'))
    reader.readAsText(file)
  })
}
