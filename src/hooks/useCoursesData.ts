import { useState, useEffect } from 'react'
import type { Course, Requirements } from '../types'
import { getActiveProgramme } from '../programmes'

const BASE = import.meta.env.BASE_URL
const programme = getActiveProgramme()

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE}${programme.coursesDataPath}`)
      .then(r => r.json())
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
