export type ChangeEmoji = 'time' | 'venue'

export interface ChangePart {
  text: string
  /** ⏰ for date/time changes, 📌 for venue changes */
  emoji?: ChangeEmoji
}

export interface TeachingPlanUpdateRow {
  /**
   * Class letter (A/B/C…) or "TUT" for tutorial-wide changes
   * (tutorials are not bound to a lecture class).
   */
  sectionId?: string
  /**
   * i18n key under teachingPlan.items.*
   * sessionVenue / sessionTime / sessionTimeVenue use itemDate
   * (+ optional itemTime when same-day same-kind sessions need disambiguation).
   */
  itemKey: string
  /** Date label for dated session items, e.g. "Nov 9" */
  itemDate?: string
  /** LEC or TUT — used to place TUT rows last; not shown in Rescheduled Item */
  sessionKind?: 'LEC' | 'TUT'
  /**
   * Clock time only when that day has multiple sessions of the same kind
   * (e.g. two LECs). Not used for a single LEC + TUT pair.
   */
  itemTime?: string
  previous: ChangePart[]
  updated: ChangePart[]
}

export interface TeachingPlanUpdate {
  courseCode: string
  courseTitle: string
  /** Course has tutorials — use LEC/TUT item labels instead of plain Time/Venue */
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
  itemKey: string
  itemDate?: string
  sessionKind?: 'LEC' | 'TUT'
  itemTime?: string
  hasTutorials: boolean
  previous: ChangePart[]
  updated: ChangePart[]
  /** Full course block (code + title) — first row of a course */
  showCourse: boolean
  /** Course code only — first row of a new class within the same course */
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
      const aTut = a.sectionId === 'TUT' || a.sessionKind === 'TUT' || a.itemKey.startsWith('tut') ? 1 : 0
      const bTut = b.sectionId === 'TUT' || b.sessionKind === 'TUT' || b.itemKey.startsWith('tut') ? 1 : 0
      return aTut - bTut
    })

    for (const [index, row] of orderedRows.entries()) {
      const section = row.sectionId ?? ''
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
 * Baseline MGM Teaching Plan archive entry (2026-08-11).
 * PDF history: public/mgm/teachingPlan/MGM Teaching plan 2026-27_YYYYMMDD.pdf
 */
const time = (text: string): ChangePart => ({ text, emoji: 'time' })
const venue = (text: string): ChangePart => ({ text, emoji: 'venue' })
const plain = (text: string): ChangePart => ({ text })

/** Newest first. */
export const teachingPlanNotices: TeachingPlanNotice[] = [
  {
    id: '20260901-7001-7024',
    timestamp: '2026/09/01 17:22',
    courseRefs: '7001, 7024',
    bodyKey: 'body7001_7024',
    bodyParams: { code1: 'PMGM7001', code2: 'PMGM7024' },
    defaultExpanded: true,
    updates: [
      {
        courseCode: 'PMGM7001',
        courseTitle: 'Fundamentals of Global Management',
        hasTutorials: false,
        rows: [
          {
            sectionId: 'A',
            itemKey: 'dates',
            previous: [plain('Sep 7, 10, 14, 17, 21, 24, 28; Oct 5, 8, 12, 2026')],
            updated: [plain('Sep 7, 10, 14, 17, 21, 24, 28; Oct 5, 8, 12, 15, 2026')],
          },
          {
            sectionId: 'B',
            itemKey: 'dates',
            previous: [plain('Sep 7, 10, 14, 17, 21, 24, 28; Oct 5, 8, 12, 2026')],
            updated: [plain('Sep 7, 10, 14, 17, 21, 24, 28; Oct 5, 8, 12, 15, 2026')],
          },
          {
            sectionId: 'C',
            itemKey: 'sessionTimeVenue',
            itemDate: 'Oct 16',
            sessionKind: 'LEC',
            previous: [plain('NA')],
            updated: [time('Oct 16, 2026 (Fri) 14:00-17:00'), venue('CP-J')],
          },
          {
            sectionId: 'D',
            itemKey: 'sessionTimeVenue',
            itemDate: 'Oct 15',
            sessionKind: 'LEC',
            previous: [plain('NA')],
            updated: [time('Oct 15, 2026 (Thu) 18:30-21:30'), venue('CP-J')],
          },
        ],
      },
      {
        courseCode: 'PMGM7024',
        courseTitle: 'Business Lab',
        hasTutorials: false,
        rows: [
          {
            sectionId: 'A',
            itemKey: 'timeVenue',
            previous: [plain('TBC')],
            updated: [
              plain(
                'Mon AM/PM/NT (occasional): Jan 25, Feb 1/15/22, Mar 1/8, 2027; CP-LTB (Mar 8 in CP-D)',
              ),
            ],
          },
          {
            sectionId: 'B',
            itemKey: 'timeVenue',
            previous: [plain('NA')],
            updated: [
              plain(
                'Wed AM/PM/NT (occasional): Jan 27, Feb 3/17/24, Mar 10, 2027; CP-D (Feb 3 & Mar 10 in CP-LTB)',
              ),
            ],
          },
        ],
      },
    ],
  },
]

/** @deprecated Prefer teachingPlanNotices */
export const teachingPlanUpdates: TeachingPlanUpdate[] =
  teachingPlanNotices.flatMap(n => n.updates)
