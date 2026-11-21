import { useState, useEffect } from 'react'
import type { Course, Requirements } from '../types'
import { getActiveProgramme } from '../programmes'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'

const BASE = import.meta.env.BASE_URL
const programme = getActiveProgramme()

/** Module cache: revisiting routes must not flash a full-page loading state. */
let coursesCache: Course[] | null = null
let coursesPromise: Promise<Course[]> | null = null
let requirementsCache: Requirements | null = null
let requirementsPromise: Promise<Requirements | null> | null = null

/**
 * Prefer shared catalogue API (Azure SQL / server filesystem).
 * Fall back to pack-local courses.json so vite-only dev still works.
 */
async function loadCourses(): Promise<Course[]> {
  // #region agent log
  const _t0 = performance.now()
  const _apiUrl = `/api/programmes/${programme.id}/courses`
  const _dbg = (hypothesisId: string, loc: string, message: string, data: Record<string, unknown>) => {
    const payload = {
      sessionId: 'ca5ade',
      runId: 'post-fix',
      hypothesisId,
      location: loc,
      message,
      data: {
        ...data,
        href: typeof window !== 'undefined' ? window.location.href : '',
      },
      timestamp: Date.now(),
    }
    try { sessionStorage.setItem('tpg_dbg_courses', JSON.stringify(payload)) } catch { /* ignore */ }
    fetch('http://127.0.0.1:7469/ingest/4ca7d749-a7d9-4b5d-ae5c-233979a57a10', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ca5ade' }, body: JSON.stringify(payload) }).catch(() => {})
  }
  _dbg('A', 'useCoursesData.ts:loadCourses:start', 'courses load start', {
    programmeId: programme.id,
    apiUrl: _apiUrl,
    base: BASE,
    sw: typeof navigator !== 'undefined' ? navigator.serviceWorker?.controller?.scriptURL ?? null : null,
    standalone: typeof window !== 'undefined' ? !!(window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as unknown as { standalone?: boolean }).standalone)) : false,
  })
  const _heartbeats =
    typeof window === 'undefined'
      ? []
      : [3000, 8000, 15000, 30000].map(ms =>
          window.setTimeout(() => {
            _dbg('A', 'useCoursesData.ts:loadCourses:heartbeat', 'courses still waiting', {
              waitedMs: ms,
              phase: 'api-or-json',
            })
          }, ms),
        )
  const _clearBeats = () => {
    if (typeof window === 'undefined') return
    for (const id of _heartbeats) window.clearTimeout(id)
  }
  // #endregion
  try {
    const apiRes = await fetchWithTimeout(_apiUrl, { cache: 'no-store' }, 4000)
    // #region agent log
    _dbg('A', 'useCoursesData.ts:loadCourses:apiRes', 'courses API response', {
      status: apiRes.status,
      ok: apiRes.ok,
      ms: Math.round(performance.now() - _t0),
      url: apiRes.url,
      ct: apiRes.headers.get('content-type'),
    })
    // #endregion
    if (apiRes.ok) {
      const body: unknown = await apiRes.json()
      if (
        body &&
        typeof body === 'object' &&
        Array.isArray((body as { courses?: unknown }).courses)
      ) {
        // #region agent log
        _clearBeats()
        _dbg('A', 'useCoursesData.ts:loadCourses:apiOk', 'courses from API', {
          count: (body as { courses: Course[] }).courses.length,
          source: (body as { source?: string }).source,
          ms: Math.round(performance.now() - _t0),
        })
        // #endregion
        return (body as { courses: Course[] }).courses
      }
      // #region agent log
      _dbg('C', 'useCoursesData.ts:loadCourses:apiBadShape', 'API ok but bad body shape', {
        keys: body && typeof body === 'object' ? Object.keys(body as object) : typeof body,
        ms: Math.round(performance.now() - _t0),
      })
      // #endregion
    }
  } catch (err) {
    // #region agent log
    _dbg('A', 'useCoursesData.ts:loadCourses:apiCatch', 'courses API threw', {
      err: err instanceof Error ? err.message : String(err),
      ms: Math.round(performance.now() - _t0),
    })
    // #endregion
    // API missing in vite-only mode
  }

  // #region agent log
  _dbg('C', 'useCoursesData.ts:loadCourses:jsonFallback', 'falling back to courses.json', {
    path: `${BASE}${programme.coursesDataPath}`,
    ms: Math.round(performance.now() - _t0),
  })
  // #endregion
  const res = await fetch(`${BASE}${programme.coursesDataPath}`)
  if (!res.ok) throw new Error(`courses fetch failed: ${res.status}`)
  const data: unknown = await res.json()
  // #region agent log
  _clearBeats()
  _dbg('C', 'useCoursesData.ts:loadCourses:jsonDone', 'courses from json', {
    count: Array.isArray(data) ? data.length : -1,
    ms: Math.round(performance.now() - _t0),
  })
  // #endregion
  return Array.isArray(data) ? (data as Course[]) : []
}

async function loadRequirements(): Promise<Requirements | null> {
  const res = await fetch(`${BASE}${programme.requirementsDataPath}`)
  if (!res.ok) throw new Error(`requirements fetch failed: ${res.status}`)
  return (await res.json()) as Requirements
}

function getCoursesPromise(): Promise<Course[]> {
  if (!coursesPromise) {
    coursesPromise = loadCourses()
      .then(courses => {
        coursesCache = courses
        return courses
      })
      .catch(err => {
        coursesPromise = null
        throw err
      })
  }
  return coursesPromise
}

function getRequirementsPromise(): Promise<Requirements | null> {
  if (!requirementsPromise) {
    requirementsPromise = loadRequirements()
      .then(req => {
        requirementsCache = req
        return req
      })
      .catch(err => {
        requirementsPromise = null
        console.error(err)
        return null
      })
  }
  return requirementsPromise
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>(() => coursesCache ?? [])
  const [loading, setLoading] = useState(() => coursesCache === null)

  useEffect(() => {
    if (coursesCache) {
      setCourses(coursesCache)
      setLoading(false)
      return
    }

    let cancelled = false
    getCoursesPromise()
      .then(next => {
        if (!cancelled) {
          setCourses(next)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error(err)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { courses, loading }
}

export function useRequirements() {
  const [requirements, setRequirements] = useState<Requirements | null>(
    () => requirementsCache,
  )

  useEffect(() => {
    if (requirementsCache) {
      setRequirements(requirementsCache)
      return
    }

    let cancelled = false
    getRequirementsPromise().then(next => {
      if (!cancelled) setRequirements(next)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return requirements
}
