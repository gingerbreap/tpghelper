import { useEffect, useSyncExternalStore } from 'react'
import {
  getTeachingPlanNotices,
  loadTeachingPlanNotices,
  subscribeTeachingPlanNotices,
} from '../data/teachingPlanNoticesStore'
import type { TeachingPlanNotice } from '../data/teachingPlanUpdates'

/** Subscribe to runtime notices (API / JSON / pack). */
export function useTeachingPlanNotices(): TeachingPlanNotice[] {
  return useSyncExternalStore(
    subscribeTeachingPlanNotices,
    getTeachingPlanNotices,
    getTeachingPlanNotices,
  )
}

/** Kick off catalogue fetch once per app mount. */
export function useHydrateTeachingPlanNotices() {
  useEffect(() => {
    void loadTeachingPlanNotices()
  }, [])
}
