import { useState, useEffect } from 'react'
import type { Course, Requirements } from '../types'
import { getActiveProgramme } from '../programmes'

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
  try {
    const apiRes = await fetch(`/api/programmes/${programme.id}/courses`)
    if (apiRes.ok) {
      const body: unknown = await apiRes.json()
      if (
        body &&
        typeof body === 'object' &&
        Array.isArray((body as { courses?: unknown }).courses)
      ) {
        return (body as { courses: Course[] }).courses
      }
    }
  } catch {
    // API missing in vite-only mode
  }

  const res = await fetch(`${BASE}${programme.coursesDataPath}`)
  if (!res.ok) throw new Error(`courses fetch failed: ${res.status}`)
  const data: unknown = await res.json()
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
