import type { Course, SelectedSection } from '../types'
import type { MeconStreamId } from '../programmes/mecon/streamTags'
import { getMeconCourseView, type MeconRole } from './meconCourseView'

export type StreamSwitchPolicy =
  | 'choose'
  | 'delete_related'
  | 'delete_core_sc_elective'
  | 'keep_core_sc_elective'
  | 'all_elective'

export interface StreamSwitchPreviewRow {
  courseCode: string
  courseTitle: string
  module: number
  sectionId: string
  currentStatus: MeconRole
  /** null = deleted (✕) */
  nextStatus: MeconRole | null
}

function findCourse(
  courses: Course[],
  courseCode: string,
  module: number,
): Course | undefined {
  return courses.find(c => c.courseCode === courseCode && c.module === module)
}

/** Selections that are Core / Stream Core / Capstone under the current stream. */
export function relatedSelectionsForSwitch(
  selections: SelectedSection[],
  courses: Course[],
  fromStream: MeconStreamId,
  toStream: MeconStreamId,
): SelectedSection[] {
  return selections.filter(s => {
    const course = findCourse(courses, s.courseCode, s.module)
    if (!course) return false
    const fromView = getMeconCourseView(course, fromStream)
    const toView = getMeconCourseView(course, toStream)
    if (!fromView) return false
    const fromRole = (s.courseType as MeconRole) || fromView.effectiveType
    if (!fromRole || fromRole === 'Elective') {
      // Capstone hidden on target still related if currently Capstone
      if (fromView.ownRoles.includes('Capstone') && !toView) return true
      return false
    }
    if (!toView) return true
    const toRole = toView.effectiveType
    if (toRole !== fromRole) return true
    // Same effective label but dual assignment type differs
    if (s.courseType !== toRole && fromView.ownRoles.includes(s.courseType as MeconRole)) {
      return s.courseType !== toRole
    }
    return false
  })
}

export function buildStreamSwitchPreview(
  selections: SelectedSection[],
  courses: Course[],
  fromStream: MeconStreamId,
  toStream: MeconStreamId,
  policy: StreamSwitchPolicy,
): StreamSwitchPreviewRow[] {
  if (policy === 'choose') return []

  const related = relatedSelectionsForSwitch(selections, courses, fromStream, toStream)
  const rows: StreamSwitchPreviewRow[] = []

  for (const s of related) {
    const course = findCourse(courses, s.courseCode, s.module)
    if (!course) continue
    const fromView = getMeconCourseView(course, fromStream)
    const toView = getMeconCourseView(course, toStream)
    const currentStatus = (['Core', 'Stream Core', 'Capstone', 'Elective'].includes(s.courseType)
      ? s.courseType
      : fromView?.effectiveType) as MeconRole

    let nextStatus: MeconRole | null

    if (!toView) {
      nextStatus = null
    } else if (policy === 'delete_related') {
      nextStatus = null
    } else if (policy === 'delete_core_sc_elective') {
      if (currentStatus === 'Core' && toView.effectiveType !== 'Core') nextStatus = null
      else if (currentStatus === 'Capstone' && !toView.ownRoles.includes('Capstone')) nextStatus = null
      else if (currentStatus === 'Stream Core') nextStatus = 'Elective'
      else nextStatus = toView.effectiveType
    } else if (policy === 'keep_core_sc_elective') {
      if (currentStatus === 'Capstone' && !toView.ownRoles.includes('Capstone')) nextStatus = null
      else if (currentStatus === 'Core') nextStatus = 'Core'
      else if (currentStatus === 'Stream Core') nextStatus = 'Elective'
      else nextStatus = toView.effectiveType
    } else {
      // all_elective
      if (currentStatus === 'Capstone' && !toView.ownRoles.includes('Capstone') && !toView.ownRoles.includes('Stream Core')) {
        nextStatus = null
      } else {
        nextStatus = 'Elective'
      }
    }

    if (nextStatus === currentStatus) continue

    rows.push({
      courseCode: s.courseCode,
      courseTitle: s.courseTitle,
      module: s.module,
      sectionId: s.sectionId,
      currentStatus,
      nextStatus,
    })
  }

  return rows
}

export function applyStreamSwitchPolicy(
  selections: SelectedSection[],
  courses: Course[],
  fromStream: MeconStreamId,
  toStream: MeconStreamId,
  policy: StreamSwitchPolicy,
): SelectedSection[] {
  if (policy === 'choose') return selections
  const preview = buildStreamSwitchPreview(selections, courses, fromStream, toStream, policy)
  const byKey = new Map<string, (typeof preview)[number]>(
    preview.map(r => [`${r.courseCode}-M${r.module}-${r.sectionId}`, r]),
  )

  const next: SelectedSection[] = []
  for (const s of selections) {
    const key = `${s.courseCode}-M${s.module}-${s.sectionId}`
    const row = byKey.get(key)
    if (!row) {
      next.push(s)
      continue
    }
    if (row.nextStatus === null) continue
    next.push({ ...s, courseType: row.nextStatus })
  }
  return next
}
