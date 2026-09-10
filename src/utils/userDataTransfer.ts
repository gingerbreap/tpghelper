import { getActiveProgramme } from '../programmes'
import {
  applySiteConfig,
  buildSiteConfig,
  parseSiteConfigJson,
  siteConfigToJson,
  type ParseSiteConfigResult,
  type SiteConfig,
} from './siteConfig'

/** Stable programme label for this planner (专业名). */
export function plannerProgrammeName(): string {
  return getActiveProgramme().shortName
}

/** @deprecated Prefer plannerProgrammeName() — kept for backups that hard-code MSc(BA). */
export const PLANNER_PROGRAMME = 'MSc(BA)' as const

/** Site-wide schema (v2). Legacy single-programme exports remain readable. */
export const USER_DATA_SCHEMA_VERSION = 2 as const

export type { SiteConfig }
export type UserDataSnapshot = SiteConfig

export function buildUserDataSnapshot(): SiteConfig {
  return buildSiteConfig()
}

export function snapshotToJson(snapshot: SiteConfig): string {
  return siteConfigToJson(snapshot)
}

export type ParseUserDataResult = ParseSiteConfigResult

export function parseUserDataJson(text: string): ParseUserDataResult {
  return parseSiteConfigJson(text)
}

/** Apply site config (all nested packs + currentProgramme) to localStorage. */
export function applyUserDataSnapshot(data: SiteConfig): void {
  applySiteConfig(data)
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
  return `tpghelper-site-config-${y}${m}${d}.json`
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
