/** Lecture section ids, sorted A, B, C… */
export function sortSectionIds(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b))
}

function isConsecutiveLetters(ids: string[]): boolean {
  if (ids.length < 2) return false
  for (let i = 1; i < ids.length; i += 1) {
    if (ids[i].length !== 1 || ids[i - 1].length !== 1) return false
    if (ids[i].charCodeAt(0) !== ids[i - 1].charCodeAt(0) + 1) return false
  }
  return true
}

/**
 * Compact subclass list for TUT labels.
 * All classes (or 3+ consecutive): A–D. Subsets: A+B, C+D. Single class: C.
 */
export function formatSectionScope(ids: string[], allIds?: string[]): string {
  const sorted = sortSectionIds(ids)
  if (sorted.length === 0) return ''
  if (sorted.length === 1) return sorted[0]

  const allSorted = allIds ? sortSectionIds(allIds) : []
  const coversAll = allSorted.length > 0
    && sorted.length === allSorted.length
    && sorted.every((id, i) => id === allSorted[i])

  if (isConsecutiveLetters(sorted) && (coversAll || sorted.length >= 3)) {
    return `${sorted[0]}–${sorted[sorted.length - 1]}`
  }
  return sorted.join('+')
}

/** Class column / chip text, e.g. `TUT (A+B)` or `TUT` when scope is unknown. */
export function formatTutClassLabel(tutorialFor?: string[], allIds?: string[]): string {
  if (!tutorialFor || tutorialFor.length === 0) return 'TUT'
  return `TUT (${formatSectionScope(tutorialFor, allIds)})`
}

export function tutorialMeetingKey(m: {
  date: string
  startTime: string
  endTime: string
  venue: string
}): string {
  return `${m.date}|${m.startTime}|${m.endTime}|${m.venue}`
}
