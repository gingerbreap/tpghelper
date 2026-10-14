import type { SelectedSection } from '../types'

export type SelectionCourseType = 'Core' | 'Stream Core' | 'Elective' | 'Capstone'

export const DEFAULT_SELECTION_TYPE_ORDER: readonly SelectionCourseType[] = [
  'Core',
  'Elective',
  'Capstone',
]

/** Group items by courseType, preserving relative order within each group. */
export function groupSelectionsByType(
  list: SelectedSection[],
  order: readonly SelectionCourseType[] = DEFAULT_SELECTION_TYPE_ORDER,
): { type: SelectionCourseType; items: SelectedSection[] }[] {
  return order
    .map(type => ({
      type,
      items: list.filter(s => s.courseType === type),
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
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= categoryItems.length
    || toIndex >= categoryItems.length
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
