import { useState, useEffect, useCallback } from 'react'
import type { SelectedSection } from '../types'
import { getActiveProgramme } from '../programmes'
import { reorderWithinCategory } from '../utils/selectionGroups'

const programme = getActiveProgramme()
const PRIMARY_KEY =
  programme.storage.wishlist
  ?? `${programme.id}-planner-wishlist`
/** Legacy MGM backup key — read once and migrate into PRIMARY_KEY. */
const LEGACY_BACKUP_KEY = programme.storage.backup

export const WISHLIST_STORAGE_KEY = PRIMARY_KEY

export type WishlistToggleResult = 'added' | 'removed'

function load(): SelectedSection[] {
  try {
    const primary = localStorage.getItem(PRIMARY_KEY)
    if (primary) {
      const parsed = JSON.parse(primary)
      return Array.isArray(parsed) ? parsed : []
    }
    if (LEGACY_BACKUP_KEY) {
      const legacy = localStorage.getItem(LEGACY_BACKUP_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy)
        if (Array.isArray(parsed)) {
          localStorage.setItem(PRIMARY_KEY, JSON.stringify(parsed))
          return parsed
        }
      }
    }
    return []
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
    localStorage.setItem(PRIMARY_KEY, JSON.stringify(wishlist))
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

  const toggle = useCallback((s: SelectedSection): WishlistToggleResult => {
    let result: WishlistToggleResult = 'added'
    setWishlist(prev => {
      if (prev.some(p => itemKey(p) === itemKey(s))) {
        result = 'removed'
        return prev.filter(p => itemKey(p) !== itemKey(s))
      }
      result = 'added'
      return [...prev, s]
    })
    return result
  }, [])

  /** Reorder within one courseType group. */
  const reorder = useCallback((courseType: string, fromIndex: number, toIndex: number) => {
    setWishlist(prev => reorderWithinCategory(prev, courseType, fromIndex, toIndex))
  }, [])

  /** Move an item into another courseType group (e.g. Stream Core ↔ Capstone). */
  const retype = useCallback((s: SelectedSection, courseType: string) => {
    setWishlist(prev =>
      prev.map(p => (itemKey(p) === itemKey(s) ? { ...p, courseType } : p)),
    )
  }, [])

  const clear = useCallback(() => setWishlist([]), [])

  return { wishlist, add, remove, toggle, reorder, retype, isInWishlist, clear }
}
