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

/** HKU MSc(BA) programme pack — default active programme for tpghelper. */
export const msbaProgramme: ProgrammeConfig = {
  id: 'msba',
  shortName: 'MSc(BA)',
  titleStem: 'HKU MSc(BA) Course Planner',
  viteBase: '/tpghelper/msba/',
  repoUrl: 'https://github.com/gingerbreap/HKUBS_BA_CourseList',
  analyticsId: 'G-TGBLKX855E',
  moduleCount: 5,
  moduleNumbers: [1, 2, 3, 4, 5],
  streamIds: ['AI', 'MC'],
  coursesDataPath: 'courses.json',
  requirementsDataPath: 'requirements.json',
  storage: {
    selections: 'msba-planner-selections',
    wishlist: 'msba-planner-wishlist',
    locale: 'msba-locale',
    defaultLanding: 'msba-default-landing',
    syncTzMode: 'msba-sync-tz-mode',
    icsExportFormat: 'msba-ics-export-format',
  },
  features: {
    wishlist: true,
    backupSelections: false,
    teachingPlanImpactCalendar: true,
    enrollmentRules: false,
  },
  dataSync: {
    display: '2026/09/03 17:23',
    iso: '2026-09-03T17:23:00+08:00',
  },
  studyStatus: {
    sampleCourseCode: 'MSBA7001',
    courseCodePattern: String.raw`MSBA\d{4}`,
  },
  ics: {
    prodId: '-//HKUBS MSc(BA) Course Planner//CN',
    uidDomain: 'hkubs-ba-planner',
    filename: 'hkubs-ba-planner.ics',
  },
}
