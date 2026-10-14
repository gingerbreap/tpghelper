import { APP_REPO_URL } from '../../config/appRepo'
import type { ProgrammeConfig } from '../types'
import { streamTagDisplay } from './streamTags'

export { streamTagDisplay }
export type { StreamTagVariant } from './streamTags'
export {
  teachingPlanNotices,
  teachingPlanUpdates,
} from './teachingPlanUpdates'
export type {
  TeachingPlanNotice,
  TeachingPlanUpdate,
  TeachingPlanUpdateRow,
  ChangePart,
  ChangeEmoji,
} from './teachingPlanUpdates'

/**
 * HKU Master of Economics (MEcon) programme pack.
 * Activate with PROGRAMME=mecon.
 *
 * Module encoding:
 * - 0 = Summer Bootcamp (ECON6067 Part I)
 * - 1–6 = Module periods
 * - 11 = Semester 1 (Modules 1–2), display "Semester 1 (M1-2)"
 * - 12 = Semester 2 (Modules 4–5), display "Semester 2 (M4-5)"
 */
export const meconProgramme: ProgrammeConfig = {
  id: 'mecon',
  shortName: 'MEcon',
  titleStem: 'HKU MEcon Course Planner',
  viteBase: '/mecon/',
  repoUrl: APP_REPO_URL,
  analyticsId: 'G-H1NZELQQ9L',
  moduleCount: 6,
  /** Display order: Bootcamp → Sem1 → M1–3 → Sem2 → M4–6 */
  moduleNumbers: [0, 11, 1, 2, 3, 12, 4, 5, 6],
  streamIds: ['ARS', 'THY', 'DA', 'PL'],
  selectionTypeOrder: ['Core', 'Stream Core', 'Capstone', 'Elective'],
  coursesDataPath: 'courses.json',
  requirementsDataPath: 'requirements.json',
  storage: {
    selections: 'mecon-planner-selections',
    wishlist: 'mecon-planner-wishlist',
    locale: 'mecon-locale',
    defaultLanding: 'mecon-default-landing',
    syncTzMode: 'mecon-sync-tz-mode',
    icsExportFormat: 'mecon-ics-export-format',
    selectedStream: 'mecon-selected-stream',
  },
  features: {
    wishlist: true,
    groupSelectedByType: true,
    teachingPlanImpactCalendar: true,
    enrollmentRules: true,
    /** Hide planner calendar/lists until the student picks a stream. */
    requireStreamSelection: true,
  },
  dataSync: {
    display: '2026/10/14 16:05',
    iso: '2026-10-14T16:05:00+08:00',
  },
  studyStatus: {
    sampleCourseCode: 'ECON6001',
    courseCodePattern: String.raw`(?:ECON|PMSC|PMGM|MSMK)\d{4}`,
  },
  ics: {
    prodId: '-//HKUBS MEcon Course Planner//CN',
    uidDomain: 'hkubs-mecon-planner',
    filename: 'hkubs-mecon-planner.ics',
  },
}
