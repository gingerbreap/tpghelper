import { isTutorialPlanRow, planRowClassKey } from '../../utils/teachingPlanRows'

export type ChangeEmoji = 'time' | 'venue'

export interface ChangePart {
  text: string
  emoji?: ChangeEmoji
}

export interface TeachingPlanUpdateRow {
  sectionId?: string
  tutorialFor?: string[]
  itemKey: string
  itemDate?: string
  sessionKind?: 'LEC' | 'TUT'
  itemTime?: string
  previous: ChangePart[]
  updated: ChangePart[]
}

export interface TeachingPlanUpdate {
  courseCode: string
  courseTitle: string
  hasTutorials?: boolean
  rows: TeachingPlanUpdateRow[]
}

export interface TeachingPlanNotice {
  id: string
  timestamp: string
  courseRefs: string
  bodyKey: string
  bodyParams?: Record<string, string>
  defaultExpanded: boolean
  updates: TeachingPlanUpdate[]
}

export interface TeachingPlanDisplayRow {
  key: string
  courseCode: string
  courseTitle: string
  sectionId?: string
  tutorialFor?: string[]
  itemKey: string
  itemDate?: string
  sessionKind?: 'LEC' | 'TUT'
  itemTime?: string
  hasTutorials: boolean
  previous: ChangePart[]
  updated: ChangePart[]
  showCourse: boolean
  showCourseCode: boolean
  showClass: boolean
  showItem: boolean
}

export function buildDisplayRows(notice: TeachingPlanNotice): TeachingPlanDisplayRow[] {
  const rows: TeachingPlanDisplayRow[] = []
  let prevCourse: string | null = null
  let prevSection: string | null = null
  let prevItemKey: string | null = null
  let prevItemDate: string | null = null
  let prevSessionKind: string | null = null
  let prevItemTime: string | null = null

  for (const update of notice.updates) {
    const hasTutorials = !!update.hasTutorials
    const orderedRows = [...update.rows].sort((a, b) => {
      const aTut = isTutorialPlanRow(a) ? 1 : 0
      const bTut = isTutorialPlanRow(b) ? 1 : 0
      return aTut - bTut
    })

    for (const [index, row] of orderedRows.entries()) {
      const section = planRowClassKey(row)
      const itemDate = row.itemDate ?? ''
      const sessionKind = row.sessionKind ?? ''
      const itemTime = row.itemTime ?? ''
      const courseChanged = update.courseCode !== prevCourse
      const classChanged = courseChanged || section !== prevSection
      const showCourse = courseChanged
      const showCourseCode = !courseChanged && classChanged
      const showClass = classChanged && !!row.sectionId
      const showItem =
        classChanged
        || row.itemKey !== prevItemKey
        || itemDate !== prevItemDate
        || sessionKind !== prevSessionKind
        || itemTime !== prevItemTime

      rows.push({
        key: `${notice.id}-${update.courseCode}-${section}-${row.itemKey}-${itemDate}-${sessionKind}-${itemTime}-${index}`,
        courseCode: update.courseCode,
        courseTitle: update.courseTitle,
        sectionId: row.sectionId,
        tutorialFor: row.tutorialFor,
        itemKey: row.itemKey,
        itemDate: row.itemDate,
        sessionKind: row.sessionKind,
        itemTime: row.itemTime,
        hasTutorials,
        previous: row.previous,
        updated: row.updated,
        showCourse,
        showCourseCode,
        showClass,
        showItem,
      })

      prevCourse = update.courseCode
      prevSection = section
      prevItemKey = row.itemKey
      prevItemDate = itemDate
      prevSessionKind = sessionKind
      prevItemTime = itemTime
    }
  }

  return rows
}

/**
 * Cold start: empty notices. Baseline PDF:
 * public/mecon/teachingPlan/MEcon_teaching_plan_2026-27_20260812.pdf
 */
export const teachingPlanNotices: TeachingPlanNotice[] = []

export const teachingPlanUpdates: TeachingPlanUpdate[] =
  teachingPlanNotices.flatMap(n => n.updates)
