import { msbaProgramme } from './msba'
import type { ProgrammeConfig, ProgrammeId } from './types'

export type { ProgrammeConfig, ProgrammeId, ProgrammeFeatureFlags, ProgrammeStorageKeys } from './types'
export { msbaProgramme }

const programmes: Record<ProgrammeId, ProgrammeConfig | undefined> = {
  msba: msbaProgramme,
  // mgm: reserved — integrate HKUBS_MGM_CourseList pack in a later pass
  mgm: undefined,
}

/** Default programme until a programme switcher / host routing exists. */
export const DEFAULT_PROGRAMME_ID: ProgrammeId = 'msba'

export function getProgramme(id: ProgrammeId = DEFAULT_PROGRAMME_ID): ProgrammeConfig {
  const pack = programmes[id]
  if (!pack) {
    throw new Error(`Programme "${id}" is not registered yet`)
  }
  return pack
}

/** Active programme for this build (MSBA-only until multi-programme shell lands). */
export function getActiveProgramme(): ProgrammeConfig {
  return getProgramme(DEFAULT_PROGRAMME_ID)
}
