import type { ProgrammeId, ProgrammeStorageKeys } from './types'

/** Static catalogue for site-wide config (all packs, independent of active build). */
export interface ProgrammeCatalogueEntry {
  id: ProgrammeId
  shortName: string
  /** Extra names accepted in JSON (legacy backups, display labels). */
  aliases: readonly string[]
  storage: ProgrammeStorageKeys
}

export const PROGRAMME_CATALOGUE: readonly ProgrammeCatalogueEntry[] = [
  {
    id: 'msba',
    shortName: 'MSc(BA)',
    aliases: ['MSc(BA)', 'MSBA', 'BA'],
    storage: {
      selections: 'msba-planner-selections',
      wishlist: 'msba-planner-wishlist',
      locale: 'msba-locale',
      defaultLanding: 'msba-default-landing',
      syncTzMode: 'msba-sync-tz-mode',
      icsExportFormat: 'msba-ics-export-format',
    },
  },
  {
    id: 'mgm',
    shortName: 'MGM',
    aliases: ['MGM'],
    storage: {
      selections: 'mgm-planner-selections',
      backup: 'mgm-planner-backup',
      locale: 'mgm-locale',
      defaultLanding: 'mgm-default-landing',
      syncTzMode: 'mgm-sync-tz-mode',
      icsExportFormat: 'mgm-ics-export-format',
    },
  },
] as const

export function getCatalogueEntry(id: string): ProgrammeCatalogueEntry | undefined {
  return PROGRAMME_CATALOGUE.find(p => p.id === id)
}

/** Resolve programme id from `currentProgramme` or legacy `programme` labels. */
export function resolveProgrammeId(raw: string | null | undefined): ProgrammeId | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  for (const entry of PROGRAMME_CATALOGUE) {
    if (entry.id === lower) return entry.id
    if (entry.shortName.toLowerCase() === lower) return entry.id
    if (entry.aliases.some(a => a.toLowerCase() === lower)) return entry.id
  }
  return null
}

export function wishlistStorageKey(entry: ProgrammeCatalogueEntry): string {
  return entry.storage.wishlist ?? entry.storage.backup ?? `${entry.id}-planner-wishlist`
}
