/**
 * Teaching Plan types + helpers for the active programme.
 * Notice *data* is loaded at runtime via teachingPlanNoticesStore
 * (Azure SQL API → public JSON → pack fallback).
 */
export { buildDisplayRows } from '../programmes/activePack'
export {
  isTutorialPlanRow,
  planClassColumnText,
  planRowClassKey,
  teachingPlanRowAffectsUser,
} from '../utils/teachingPlanRows'
export type {
  TeachingPlanNotice,
  TeachingPlanUpdate,
  TeachingPlanUpdateRow,
  TeachingPlanDisplayRow,
  ChangePart,
  ChangeEmoji,
} from '../programmes/activePack'

export {
  getTeachingPlanNotices,
  loadTeachingPlanNotices,
  loadProgrammeNoticesCatalog,
} from './teachingPlanNoticesStore'
