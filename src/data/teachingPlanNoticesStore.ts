/**
 * Runtime Teaching Plan notices for the active programme.
 * Prefer /api → public teachingPlanNotices.json → pack compile-time fallback.
 */
import { teachingPlanNotices as packFallback } from '../programmes/activePack'
import type { TeachingPlanNotice } from '../programmes/activePack'
import { getActiveProgramme } from '../programmes'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'

let notices: TeachingPlanNotice[] = [...packFallback]
let source: 'pack' | 'api' | 'json' | 'pending' = 'pack'
const listeners = new Set<() => void>()

export function getTeachingPlanNotices(): TeachingPlanNotice[] {
  return notices
}

export function getTeachingPlanNoticesSource() {
  return source
}

export function subscribeTeachingPlanNotices(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function emit() {
  for (const listener of listeners) listener()
}

export function setTeachingPlanNotices(
  next: TeachingPlanNotice[],
  nextSource: typeof source = 'api',
) {
  notices = next
  source = nextSource
  emit()
}

/**
 * Hydrate from catalogue API, then pack-local JSON, then compiled pack.
 * Safe to call multiple times (e.g. StrictMode).
 */
export async function loadTeachingPlanNotices(): Promise<typeof source> {
  const programme = getActiveProgramme()
  const base = import.meta.env.BASE_URL
  // #region agent log
  const _t0 = performance.now()
  fetch('http://127.0.0.1:7469/ingest/4ca7d749-a7d9-4b5d-ae5c-233979a57a10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ca5ade'},body:JSON.stringify({sessionId:'ca5ade',runId:'pre',hypothesisId:'D',location:'teachingPlanNoticesStore.ts:start',message:'notices hydrate start',data:{programmeId:programme.id},timestamp:Date.now()})}).catch(()=>{})
  // #endregion

  try {
    const apiRes = await fetchWithTimeout(
      `/api/programmes/${programme.id}/notices`,
      { cache: 'no-store' },
      4000,
    )
    // #region agent log
    fetch('http://127.0.0.1:7469/ingest/4ca7d749-a7d9-4b5d-ae5c-233979a57a10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ca5ade'},body:JSON.stringify({sessionId:'ca5ade',runId:'post-fix',hypothesisId:'D',location:'teachingPlanNoticesStore.ts:apiRes',message:'notices API response',data:{status:apiRes.status,ok:apiRes.ok,ms:Math.round(performance.now()-_t0)},timestamp:Date.now()})}).catch(()=>{})
    // #endregion
    if (apiRes.ok) {
      const body: unknown = await apiRes.json()
      if (
        body &&
        typeof body === 'object' &&
        Array.isArray((body as { notices?: unknown }).notices)
      ) {
        setTeachingPlanNotices(
          (body as { notices: TeachingPlanNotice[] }).notices,
          'api',
        )
        return 'api'
      }
    }
  } catch {
    /* API missing in vite-only mode */
  }

  try {
    const res = await fetch(`${base}teachingPlanNotices.json`)
    if (res.ok) {
      const data: unknown = await res.json()
      if (Array.isArray(data)) {
        setTeachingPlanNotices(data as TeachingPlanNotice[], 'json')
        return 'json'
      }
    }
  } catch {
    /* ignore */
  }

  setTeachingPlanNotices([...packFallback], 'pack')
  return 'pack'
}

/** Cross-programme notice lists for site config import/export. */
const programmeNoticeCache = new Map<string, TeachingPlanNotice[]>()

export async function loadProgrammeNoticesCatalog(
  programmeId: string,
): Promise<TeachingPlanNotice[]> {
  const cached = programmeNoticeCache.get(programmeId)
  if (cached) return cached

  try {
    const apiRes = await fetchWithTimeout(
      `/api/programmes/${programmeId}/notices`,
      { cache: 'no-store' },
      4000,
    )
    if (apiRes.ok) {
      const body: unknown = await apiRes.json()
      if (
        body &&
        typeof body === 'object' &&
        Array.isArray((body as { notices?: unknown }).notices)
      ) {
        const list = (body as { notices: TeachingPlanNotice[] }).notices
        programmeNoticeCache.set(programmeId, list)
        return list
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch(`/${programmeId}/teachingPlanNotices.json`)
    if (res.ok) {
      const data: unknown = await res.json()
      if (Array.isArray(data)) {
        const list = data as TeachingPlanNotice[]
        programmeNoticeCache.set(programmeId, list)
        return list
      }
    }
  } catch {
    /* fall through */
  }

  programmeNoticeCache.set(programmeId, [])
  return []
}
