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

/** HKU MGM programme pack. Activate with PROGRAMME=mgm. */
export const mgmProgramme: ProgrammeConfig = {
  id: 'mgm',
  shortName: 'MGM',
  titleStem: 'HKU MGM Course Planner',
  viteBase: '/mgm/',
  repoUrl: APP_REPO_URL,
  analyticsId: 'G-P5JGQYVL02',
  moduleCount: 6,
  moduleNumbers: [1, 2, 3, 4, 5, 6],
  streamIds: ['ESG'],
  selectionTypeOrder: ['Core', 'Elective', 'Capstone', 'Common Elective'],
  coursesDataPath: 'courses.json',
  requirementsDataPath: 'requirements.json',
  storage: {
    selections: 'mgm-planner-selections',
    wishlist: 'mgm-planner-wishlist',
    /** Legacy key; migrated into wishlist on first load. */
    backup: 'mgm-planner-backup',
    locale: 'mgm-locale',
    defaultLanding: 'mgm-default-landing',
    syncTzMode: 'mgm-sync-tz-mode',
    icsExportFormat: 'mgm-ics-export-format',
  },
  features: {
    wishlist: true,
    groupSelectedByType: true,
    teachingPlanImpactCalendar: true,
    enrollmentRules: true,
  },
  dataSync: '2026/11/04 17:32',
  studyStatus: {
    sampleCourseCode: 'PMGM7001',
    courseCodePattern: String.raw`(?:PMGM|MFIN|PMSC|MSBA|ECON|PMBA|IMBA|MACC|MAIB|MSMK|PMWM|PMAA|MSAF)\d{4}`,
  },
  ics: {
    prodId: '-//HKUBS MGM Course Planner//CN',
    uidDomain: 'hkubs-mgm-planner',
    filename: 'hkubs-mgm-planner.ics',
  },
}
