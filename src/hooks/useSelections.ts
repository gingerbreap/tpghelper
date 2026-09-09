import { useState, useEffect, useCallback } from 'react'
import type { SelectedSection } from '../types'
import { getActiveProgramme } from '../programmes'

const STORAGE_KEY = getActiveProgramme().storage.selections

export type ToggleResult = 'added' | 'removed' | 'duplicate'

function load(): SelectedSection[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function useSelections() {
  const [selections, setSelections] = useState<SelectedSection[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
  }, [selections])

  const getForCourseCode = useCallback((courseCode: string) => {
    return selections.find(s => s.courseCode === courseCode)
  }, [selections])

  const toggle = useCallback((s: SelectedSection): ToggleResult => {
    let result: ToggleResult = 'added'
    setSelections(prev => {
      const existsExact = prev.some(
        p => p.courseCode === s.courseCode && p.module === s.module && p.sectionId === s.sectionId,
      )

      if (existsExact) {
        result = 'removed'
        return prev.filter(
          p => !(p.courseCode === s.courseCode && p.module === s.module && p.sectionId === s.sectionId),
        )
      }

      const sameCode = prev.find(p => p.courseCode === s.courseCode)
      if (sameCode) {
        result = 'duplicate'
        return prev
      }

      result = 'added'
      return [...prev, s]
    })
    return result
  }, [])

  const isSelected = useCallback((courseCode: string, module: number, sectionId: string) => {
    return selections.some(s => s.courseCode === courseCode && s.module === module && s.sectionId === sectionId)
  }, [selections])

  const clear = useCallback(() => setSelections([]), [])

  /** Replace the plan after a successful import from HKU Business School CES. */
  const replace = useCallback((nextSelections: SelectedSection[]) => {
    setSelections(nextSelections)
  }, [])

  return { selections, toggle, isSelected, getForCourseCode, clear, replace }
}
