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
  viteBase: '/tpghelper/mgm/',
  repoUrl: 'https://github.com/gingerbreap/HKUBS_MGM_Helper',
  analyticsId: 'G-P5JGQYVL02',
  moduleCount: 6,
  moduleNumbers: [1, 2, 3, 4, 5, 6],
  streamIds: ['ESG'],
  coursesDataPath: 'courses.json',
  requirementsDataPath: 'requirements.json',
  storage: {
    selections: 'mgm-planner-selections',
    backup: 'mgm-planner-backup',
    locale: 'mgm-locale',
    defaultLanding: 'mgm-default-landing',
    syncTzMode: 'mgm-sync-tz-mode',
    icsExportFormat: 'mgm-ics-export-format',
  },
  features: {
    wishlist: false,
    backupSelections: true,
    teachingPlanImpactCalendar: true,
    enrollmentRules: true,
  },
  dataSync: {
    display: '2026/09/01 17:22',
    iso: '2026-09-01T17:22:00+08:00',
  },
  studyStatus: {
    sampleCourseCode: 'PMGM7001',
    courseCodePattern: String.raw`(?:PMGM|MFIN|PMSC)\d{4}`,
  },
  ics: {
    prodId: '-//HKUBS MGM Course Planner//CN',
    uidDomain: 'hkubs-mgm-planner',
    filename: 'hkubs-mgm-planner.ics',
  },
}
