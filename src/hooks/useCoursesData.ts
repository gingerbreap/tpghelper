import { useState, useEffect } from 'react'
import type { Course, Requirements } from '../types'
import { getActiveProgramme } from '../programmes'

const BASE = import.meta.env.BASE_URL
const programme = getActiveProgramme()

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

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { courses, loading }
}

export function useRequirements() {
  const [requirements, setRequirements] = useState<Requirements | null>(null)

  useEffect(() => {
    fetch(`${BASE}${programme.requirementsDataPath}`)
      .then(r => r.json())
      .then(setRequirements)
      .catch(console.error)
  }, [])

  return requirements
}
