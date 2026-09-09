import { useState, useEffect, useCallback } from 'react'
import type { SelectedSection } from '../types'
import { getActiveProgramme } from '../programmes'

const STORAGE_KEY = getActiveProgramme().storage.wishlist!

function load(): SelectedSection[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function itemKey(s: SelectedSection): string {
  return `${s.courseCode}-M${s.module}-${s.sectionId}`
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<SelectedSection[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist))
  }, [wishlist])

  const isInWishlist = useCallback((courseCode: string, module: number, sectionId: string) => {
    return wishlist.some(
      s => s.courseCode === courseCode && s.module === module && s.sectionId === sectionId,
    )
  }, [wishlist])

  const add = useCallback((s: SelectedSection) => {
    setWishlist(prev => {
      if (prev.some(p => itemKey(p) === itemKey(s))) return prev
      return [...prev, s]
    })
  }, [])

  const remove = useCallback((s: SelectedSection) => {
    setWishlist(prev => prev.filter(p => itemKey(p) !== itemKey(s)))
  }, [])

  const toggle = useCallback((s: SelectedSection) => {
    setWishlist(prev => {
      if (prev.some(p => itemKey(p) === itemKey(s))) {
        return prev.filter(p => itemKey(p) !== itemKey(s))
      }
      return [...prev, s]
    })
  }, [])

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setWishlist(prev => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev
      }
      const next = [...prev]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      return next
    })
  }, [])

  const clear = useCallback(() => setWishlist([]), [])

  return { wishlist, add, remove, toggle, reorder, isInWishlist, clear }
}
