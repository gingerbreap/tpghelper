/** Active-pack surface for PROGRAMME=mecon (Vite `@programme/pack` alias). */
export { meconProgramme as programme } from './index'
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
