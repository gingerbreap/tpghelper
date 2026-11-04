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

/** HKU MSc(BA) programme pack — default active programme for tpghelper. */
export const msbaProgramme: ProgrammeConfig = {
  id: 'msba',
  shortName: 'MSc(BA)',
  titleStem: 'HKU MSc(BA) Course Planner',
  viteBase: '/msba/',
  repoUrl: APP_REPO_URL,
  analyticsId: 'G-TGBLKX855E',
  moduleCount: 6,
  moduleNumbers: [1, 2, 3, 4, 5, 6],
  streamIds: ['AI', 'MC'],
  selectionTypeOrder: ['Core', 'Capstone', 'Elective', 'Common Elective'],
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
    groupSelectedByType: true,
    teachingPlanImpactCalendar: true,
    enrollmentRules: true,
  },
  dataSync: '2026/11/04 17:32',
  studyStatus: {
    sampleCourseCode: 'MSBA7001',
    courseCodePattern: String.raw`(?:MSBA|PMGM|ECON|PMBA|IMBA|MACC|MAIB|MFIN|MSMK|PMWM|PMAA|MSAF|PMSC)\d{4}`,
  },
  ics: {
    prodId: '-//HKUBS MSc(BA) Course Planner//CN',
    uidDomain: 'hkubs-ba-planner',
    filename: 'hkubs-ba-planner.ics',
  },
}
