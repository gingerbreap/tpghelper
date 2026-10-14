import type { CapstoneOption, Requirements } from '../types'
import type { MeconStreamId } from '../programmes/mecon/streamTags'

export interface MeconRequirementTargets {
  total: number
  core: number
  streamCore: number
  capstone: number
  elective: number
  /** Credits assumed for the capstone slot (6 or 12). */
  capstoneCredits: number
}

/** Default / stream-based denominators for planner stat cards. */
export function getMeconRequirementTargets(
  req: Requirements | null | undefined,
  stream: MeconStreamId | null,
): MeconRequirementTargets {
  const creditsPerCourse = req?.creditsPerCourse ?? 6
  const totalCredits = req?.totalCredits ?? 60
  const core = req?.coreRequired ?? 3
  const streamCore = req?.streamCoreRequired ?? 3
  const capstone = req?.capstoneRequired ?? 1

  let capstoneCredits = creditsPerCourse
  if (stream && req?.capstoneByStream?.[stream]?.length) {
    const options = req.capstoneByStream[stream]
    // If every option is 12 credits (ARS thesis), use 12; else default 6.
    const allTwelve = options.every(o => (o.credits ?? creditsPerCourse) === 12)
    capstoneCredits = allTwelve ? 12 : creditsPerCourse
  } else if (stream === 'ARS') {
    capstoneCredits = 12
  }

  const used = core * creditsPerCourse + streamCore * creditsPerCourse + capstoneCredits
  const elective = Math.max(0, Math.round((totalCredits - used) / creditsPerCourse))
  const total = core + streamCore + capstone + elective

  return { total, core, streamCore, capstone, elective, capstoneCredits }
}

export function capstonesForStream(
  req: Requirements,
  stream: MeconStreamId,
): CapstoneOption[] {
  return req.capstoneByStream?.[stream] ?? []
}
