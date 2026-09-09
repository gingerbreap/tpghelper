import { programme } from './activePack'
import type { ProgrammeConfig, ProgrammeId } from './types'

export type { ProgrammeConfig, ProgrammeId, ProgrammeFeatureFlags, ProgrammeStorageKeys } from './types'

/** Default when PROGRAMME env / define is missing (matches Vite default). */
export const DEFAULT_PROGRAMME_ID: ProgrammeId = programme.id

/**
 * Resolve a programme config for this build.
 * Only the active pack is linked via `activePack.ts` (see scripts/select-programme.mjs).
 */
export function getProgramme(id: ProgrammeId = programme.id): ProgrammeConfig {
  if (id !== programme.id) {
    throw new Error(`Programme "${id}" is not in this build (active: ${programme.id})`)
  }
  return programme
}

/** Active programme for this build (set via PROGRAMME=msba|mgm). */
export function getActiveProgramme(): ProgrammeConfig {
  return programme
}
