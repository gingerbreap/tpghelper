import type { Course } from '../types'
import type { MeconStreamId } from '../programmes/mecon/streamTags'

export type MeconRole = 'Core' | 'Stream Core' | 'Capstone' | 'Elective'

export interface MeconBadge {
  /** Display label, e.g. CORE, STM CORE, PL/CORE */
  label: string
  /** CSS modifier */
  variant: 'core' | 'stream-core' | 'capstone' | 'elective' | 'prefixed'
  /** Stream prefix when badge is for another stream */
  streamPrefix?: MeconStreamId
}

export interface MeconCourseView {
  /** null → hide from browse/timetable for this stream */
  effectiveType: MeconRole | null
  badges: MeconBadge[]
  /** Roles this course has for the active stream (no prefix). */
  ownRoles: MeconRole[]
  /** Roles for other streams (prefixed badges). */
  otherRoles: Array<{ stream: MeconStreamId; role: MeconRole }>
}

const ROLE_LABEL: Record<MeconRole, string> = {
  Core: 'CORE',
  'Stream Core': 'STM CORE',
  Capstone: 'CAPSTONE',
  Elective: 'ELECTIVES',
}

function uniqueRoles(roles: MeconRole[]): MeconRole[] {
  const order: MeconRole[] = ['Core', 'Stream Core', 'Capstone', 'Elective']
  return order.filter(r => roles.includes(r))
}

function coreStreams(course: Course): MeconStreamId[] {
  if (course.coreForStreams?.length) return course.coreForStreams as MeconStreamId[]
  if (course.courseType !== 'Core') return []
  if (course.offeredToStreams?.length) return course.offeredToStreams as MeconStreamId[]
  return ['ARS', 'THY', 'DA', 'PL']
}

function streamCoreStreams(course: Course): MeconStreamId[] {
  if (course.streamCoreForStreams?.length) {
    return course.streamCoreForStreams as MeconStreamId[]
  }
  const hasSc =
    course.courseType === 'Stream Core'
    || course.courseTypes?.includes('Stream Core')
  if (!hasSc) return []
  if (course.offeredToStreams?.length) return course.offeredToStreams as MeconStreamId[]
  return ['ARS', 'THY', 'DA', 'PL']
}

function capstoneStreams(course: Course): MeconStreamId[] {
  if (course.capstoneForStreams?.length) {
    return course.capstoneForStreams as MeconStreamId[]
  }
  const hasCap =
    course.courseType === 'Capstone'
    || course.courseTypes?.includes('Capstone')
  if (!hasCap) return []
  if (course.offeredToStreams?.length) return course.offeredToStreams as MeconStreamId[]
  return ['ARS', 'THY', 'DA', 'PL']
}

function rolesForStream(course: Course, stream: MeconStreamId): MeconRole[] {
  const roles: MeconRole[] = []
  if (coreStreams(course).includes(stream)) roles.push('Core')
  if (streamCoreStreams(course).includes(stream)) roles.push('Stream Core')
  if (capstoneStreams(course).includes(stream)) roles.push('Capstone')
  if (course.courseType === 'Elective' && roles.length === 0) roles.push('Elective')
  return uniqueRoles(roles)
}

/**
 * Visibility + badges for MEcon under a forced stream selection.
 * Capstone not offered to this stream → hidden (unless also Core/SC here or
 * Core/SC for other streams → then shown as Elective).
 */
export function getMeconCourseView(
  course: Course,
  stream: MeconStreamId | null,
): MeconCourseView | null {
  if (!stream) {
    return {
      effectiveType: course.courseType === 'Stream Core' ? 'Stream Core' : course.courseType as MeconRole,
      badges: [{
        label: ROLE_LABEL[
          course.courseType === 'Stream Core' ? 'Stream Core' : course.courseType as MeconRole
        ] ?? course.courseType,
        variant:
          course.courseType === 'Core'
            ? 'core'
            : course.courseType === 'Stream Core'
              ? 'stream-core'
              : course.courseType === 'Capstone'
                ? 'capstone'
                : 'elective',
      }],
      ownRoles: [],
      otherRoles: [],
    }
  }

  const own = rolesForStream(course, stream)
  const allStreams: MeconStreamId[] = ['ARS', 'THY', 'DA', 'PL']
  const otherRoles: Array<{ stream: MeconStreamId; role: MeconRole }> = []
  for (const s of allStreams) {
    if (s === stream) continue
    for (const role of rolesForStream(course, s)) {
      if (role === 'Elective') continue
      otherRoles.push({ stream: s, role })
    }
  }

  const hasOwnReq = own.some(r => r === 'Core' || r === 'Stream Core' || r === 'Capstone')
  const hasOtherReq = otherRoles.length > 0
  const isPlainElective = course.courseType === 'Elective' && !hasOwnReq && !hasOtherReq

  // Pure Capstone for other streams only → hide
  const onlyCapstoneElsewhere =
    !hasOwnReq
    && hasOtherReq
    && otherRoles.every(o => o.role === 'Capstone')
    && !coreStreams(course).length
    && !streamCoreStreams(course).length

  if (onlyCapstoneElsewhere) return null

  // Capstone-only course not for this stream (and no SC/Core elsewhere) → hide
  const isCapstoneTyped =
    course.courseType === 'Capstone'
    || (!!course.courseTypes?.includes('Capstone')
      && course.courseType !== 'Stream Core'
      && course.courseType !== 'Core')
  if (
    isCapstoneTyped
    && !own.includes('Capstone')
    && !own.includes('Core')
    && !own.includes('Stream Core')
    && !hasOtherReq
  ) {
    return null
  }
  if (
    (course.courseType === 'Capstone' || course.courseTypes?.includes('Capstone'))
    && !own.includes('Capstone')
    && !own.includes('Stream Core')
    && !own.includes('Core')
    && otherRoles.every(o => o.role === 'Capstone')
  ) {
    return null
  }

  let effectiveType: MeconRole
  if (own.includes('Core')) effectiveType = 'Core'
  else if (own.includes('Stream Core')) effectiveType = 'Stream Core'
  else if (own.includes('Capstone')) effectiveType = 'Capstone'
  else if (isPlainElective || hasOtherReq) effectiveType = 'Elective'
  else if (own.includes('Elective')) effectiveType = 'Elective'
  else effectiveType = 'Elective'

  // Dual: Stream Core + Capstone for this stream → primary Stream Core, both in ownRoles
  const ownRoles = own.length > 0 ? own : (['Elective'] as MeconRole[])

  const badges: MeconBadge[] = []
  // Prefer all own-stream statuses first (no prefix)
  for (const role of uniqueRoles(ownRoles.includes('Elective') && effectiveType === 'Elective' && hasOtherReq
    ? ['Elective', ...ownRoles.filter(r => r !== 'Elective')]
    : ownRoles.length ? ownRoles : [effectiveType])) {
    const variant =
      role === 'Core'
        ? 'core'
        : role === 'Stream Core'
          ? 'stream-core'
          : role === 'Capstone'
            ? 'capstone'
            : 'elective'
    badges.push({ label: ROLE_LABEL[role], variant })
  }

  // If showing as Elective due to other-stream Core/SC, ensure ELECTIVES leads
  if (effectiveType === 'Elective' && hasOtherReq && !badges.some(b => b.label === 'ELECTIVES')) {
    badges.unshift({ label: 'ELECTIVES', variant: 'elective' })
  }

  for (const { stream: s, role } of otherRoles) {
    // Skip if same role already shown as own
    if (ownRoles.includes(role) && role !== 'Elective') continue
    badges.push({
      label: `${s}/${ROLE_LABEL[role]}`,
      variant: 'prefixed',
      streamPrefix: s,
    })
  }

  // Dedupe labels
  const seen = new Set<string>()
  const deduped = badges.filter(b => {
    if (seen.has(b.label)) return false
    seen.add(b.label)
    return true
  })

  return {
    effectiveType,
    badges: deduped,
    ownRoles,
    otherRoles,
  }
}

export function isMeconDualStreamCapstone(course: Course): boolean {
  return (
    (course.courseTypes?.includes('Stream Core') && course.courseTypes?.includes('Capstone'))
    || (course.courseType === 'Stream Core' && !!course.courseTypes?.includes('Capstone'))
  )
}

/** Default planner grouping type when adding a dual-role course. */
export function defaultSelectionType(course: Course, stream: MeconStreamId | null): string {
  const view = getMeconCourseView(course, stream)
  if (!view?.effectiveType) return course.courseType
  if (isMeconDualStreamCapstone(course) && view.ownRoles.includes('Stream Core')) {
    return 'Stream Core'
  }
  return view.effectiveType
}
