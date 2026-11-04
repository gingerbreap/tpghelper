import { APP_REPO_URL } from '../config/appRepo'
import { getProgrammeDataSync } from '../data/programmeMetaStore'
import { getActiveProgramme } from '../programmes'

const programme = getActiveProgramme()

/** Pack fallback HKT stamp; prefer runtime store via getProgrammeDataSync. */
export const DATA_SYNC_HKT = programme.dataSync

export const DEFAULT_LANDING_STORAGE_KEY = programme.storage.defaultLanding
export type DefaultLanding = 'planner' | 'calendar'

export function getAppVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.1.0'
}

export function getAppCommitSha(): string {
  return typeof __APP_COMMIT_SHA__ !== 'undefined' ? __APP_COMMIT_SHA__ : ''
}

export function getAppRepoUrl(): string {
  if (typeof __APP_REPO_URL__ !== 'undefined' && __APP_REPO_URL__) {
    return __APP_REPO_URL__
  }
  return programme.repoUrl || APP_REPO_URL
}

export function getCommitUrl(sha = getAppCommitSha()): string | null {
  if (!sha) return null
  return `${getAppRepoUrl()}/commit/${sha}`
}

export type SyncTimezoneMode = 'HKT' | 'local'

const TZ_STORAGE_KEY = programme.storage.syncTzMode

export function getSyncTimezoneMode(): SyncTimezoneMode {
  try {
    return localStorage.getItem(TZ_STORAGE_KEY) === 'local' ? 'local' : 'HKT'
  } catch {
    return 'HKT'
  }
}

export function setSyncTimezoneMode(mode: SyncTimezoneMode): void {
  try {
    localStorage.setItem(TZ_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

/** Format as yyyy/MM/dd HH:mm in the given IANA timezone. */
function formatInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? ''

  const year = get('year')
  const month = get('month')
  const day = get('day')
  let hour = get('hour')
  // Some engines emit "24" for midnight
  if (hour === '24') hour = '00'
  const minute = get('minute')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

/** Parse stored HKT wall clock `yyyy/MM/dd HH:mm` into an absolute Date. */
function parseHktWallClock(hkt: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(hkt.trim())
  if (!m) return null
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+08:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDataSyncTime(
  mode: SyncTimezoneMode,
  hkt: string = getProgrammeDataSync(),
): string {
  if (mode === 'HKT') return hkt
  const date = parseHktWallClock(hkt)
  if (!date) return hkt
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return formatInTimeZone(date, localTz)
}

export function getDefaultLanding(): DefaultLanding {
  try {
    return localStorage.getItem(DEFAULT_LANDING_STORAGE_KEY) === 'calendar'
      ? 'calendar'
      : 'planner'
  } catch {
    return 'planner'
  }
}

export function setDefaultLanding(value: DefaultLanding): void {
  try {
    localStorage.setItem(DEFAULT_LANDING_STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
}

export function defaultLandingPath(value: DefaultLanding = getDefaultLanding()): string {
  return value === 'calendar' ? '/calendar' : '/planner'
}

/** Archive title course list: "7002, 7003, 7004" */
export function archiveCourseNumbers(courseRefs: string): string {
  return courseRefs.replace(/\s*&\s*/g, ', ')
}

