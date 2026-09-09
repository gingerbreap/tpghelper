import { useState, useEffect, useCallback } from 'react'
import type { SelectedSection } from '../types'
import { getActiveProgramme } from '../programmes'

const STORAGE_KEY =
  getActiveProgramme().storage.backup ?? `${getActiveProgramme().id}-planner-backup`

export type BackupToggleResult = 'added' | 'removed'

function sameSection(a: SelectedSection, b: SelectedSection) {
  return a.courseCode === b.courseCode && a.module === b.module && a.sectionId === b.sectionId
}

function load(): SelectedSection[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/** Group backup items by course type, preserving relative order within each group. */
export function groupBackupByType(backup: SelectedSection[]) {
  const order = ['Core', 'Elective', 'Capstone'] as const
  return order
    .map(type => ({
      type,
      items: backup.filter(s => s.courseType === type),
    }))
    .filter(group => group.items.length > 0)
}

/** Reorder within one courseType group; other types keep their positions. */
export function reorderWithinCategory(
  list: SelectedSection[],
  courseType: string,
  fromIndex: number,
  toIndex: number,
): SelectedSection[] {
  if (fromIndex === toIndex) return list

  const categoryIndices: number[] = []
  const categoryItems: SelectedSection[] = []
  list.forEach((item, i) => {
    if (item.courseType === courseType) {
      categoryIndices.push(i)
      categoryItems.push(item)
    }
  })

  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= categoryItems.length ||
    toIndex >= categoryItems.length
  ) {
    return list
  }

  const [moved] = categoryItems.splice(fromIndex, 1)
  categoryItems.splice(toIndex, 0, moved)

  const next = [...list]
  categoryIndices.forEach((globalIndex, i) => {
    next[globalIndex] = categoryItems[i]
  })
  return next
}

export function useBackupSelections() {
  const [backup, setBackup] = useState<SelectedSection[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))
  }, [backup])

  const toggle = useCallback((s: SelectedSection): BackupToggleResult => {
    let result: BackupToggleResult = 'added'
    setBackup(prev => {
      const exists = prev.some(p => sameSection(p, s))
      if (exists) {
        result = 'removed'
        return prev.filter(p => !sameSection(p, s))
      }
      result = 'added'
      return [...prev, s]
    })
    return result
  }, [])

  const remove = useCallback((s: SelectedSection) => {
    setBackup(prev => prev.filter(p => !sameSection(p, s)))
  }, [])

  const isBackup = useCallback((courseCode: string, module: number, sectionId: string) => {
    return backup.some(
      s => s.courseCode === courseCode && s.module === module && s.sectionId === sectionId,
    )
  }, [backup])

  const reorder = useCallback((courseType: string, fromIndex: number, toIndex: number) => {
    setBackup(prev => reorderWithinCategory(prev, courseType, fromIndex, toIndex))
  }, [])

  const clear = useCallback(() => setBackup([]), [])

  return { backup, toggle, remove, isBackup, reorder, clear }
}
