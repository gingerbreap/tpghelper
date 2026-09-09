import { getActiveProgramme } from '../programmes'
import { streamTagDisplay as msbaStreamTagDisplay } from '../programmes/msba/streamTags'
import { streamTagDisplay as mgmStreamTagDisplay } from '../programmes/mgm/streamTags'
import type { StreamTagVariant as MsbaVariant } from '../programmes/msba/streamTags'
import type { StreamTagVariant as MgmVariant } from '../programmes/mgm/streamTags'

export type StreamTagVariant = MsbaVariant | MgmVariant

export function streamTagDisplay(tag: string): { label: string; variant: StreamTagVariant } {
  return getActiveProgramme().id === 'mgm'
    ? mgmStreamTagDisplay(tag)
    : msbaStreamTagDisplay(tag)
}
