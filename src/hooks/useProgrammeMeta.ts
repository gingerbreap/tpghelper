import { useEffect, useSyncExternalStore } from 'react'
import {
  getProgrammeDataSync,
  loadProgrammeMeta,
  subscribeProgrammeMeta,
} from '../data/programmeMetaStore'

/** Subscribe to runtime HKT dataSync stamp (API / JSON / pack). */
export function useProgrammeDataSync(): string {
  return useSyncExternalStore(
    subscribeProgrammeMeta,
    getProgrammeDataSync,
    getProgrammeDataSync,
  )
}

/** Kick off meta fetch once per app mount. */
export function useHydrateProgrammeMeta() {
  useEffect(() => {
    void loadProgrammeMeta()
  }, [])
}
