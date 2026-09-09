/** Active-pack surface for PROGRAMME=mgm (Vite `@programme/pack` alias). */
export { mgmProgramme as programme } from './index'
export {
  teachingPlanNotices,
  teachingPlanUpdates,
  buildDisplayRows,
} from './teachingPlanUpdates'
export type {
  TeachingPlanNotice,
  TeachingPlanUpdate,
  TeachingPlanUpdateRow,
  TeachingPlanDisplayRow,
  ChangePart,
  ChangeEmoji,
} from './teachingPlanUpdates'
export { streamTagDisplay } from './streamTags'
export type { StreamTagVariant } from './streamTags'
