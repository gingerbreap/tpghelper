import { msbaProgramme } from './msba'
import { mgmProgramme } from './mgm'
import type { ProgrammeConfig, ProgrammeId } from './types'

export type { ProgrammeConfig, ProgrammeId, ProgrammeFeatureFlags, ProgrammeStorageKeys } from './types'
export { msbaProgramme, mgmProgramme }

const programmes: Record<ProgrammeId, ProgrammeConfig> = {
  msba: msbaProgramme,
  mgm: mgmProgramme,
}

/** Default when PROGRAMME env / define is missing. */
export const DEFAULT_PROGRAMME_ID: ProgrammeId = 'msba'

function resolveProgrammeId(): ProgrammeId {
  const fromDefine =
    typeof __PROGRAMME_ID__ !== 'undefined' ? (__PROGRAMME_ID__ as string) : ''
  if (fromDefine === 'msba' || fromDefine === 'mgm') return fromDefine
  return DEFAULT_PROGRAMME_ID
}

export function getProgramme(id: ProgrammeId = resolveProgrammeId()): ProgrammeConfig {
  const pack = programmes[id]
  if (!pack) {
    throw new Error(`Programme "${id}" is not registered`)
  }
  return pack
}

/** Active programme for this build (set via PROGRAMME=msba|mgm). */
export function getActiveProgramme(): ProgrammeConfig {
  return getProgramme(resolveProgrammeId())
}
