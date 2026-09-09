/**
 * Teaching Plan notices for the active programme pack
 * (`src/programmes/{msba|mgm}/teachingPlanUpdates.ts`).
 */
import { getActiveProgramme } from '../programmes'
import * as msba from '../programmes/msba/teachingPlanUpdates'
import * as mgm from '../programmes/mgm/teachingPlanUpdates'

export type {
  TeachingPlanNotice,
  TeachingPlanUpdate,
  TeachingPlanUpdateRow,
  TeachingPlanDisplayRow,
  ChangePart,
  ChangeEmoji,
} from '../programmes/msba/teachingPlanUpdates'

const pack = getActiveProgramme().id === 'mgm' ? mgm : msba

export const teachingPlanNotices = pack.teachingPlanNotices
export const teachingPlanUpdates = pack.teachingPlanUpdates
export const buildDisplayRows = pack.buildDisplayRows
