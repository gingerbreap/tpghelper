import { formatTutClassLabel } from './tutorialScope'

export function isTutorialPlanRow(row: {
  sectionId?: string
  sessionKind?: 'LEC' | 'TUT'
  itemKey: string
}): boolean {
  return row.sessionKind === 'TUT' || row.sectionId === 'TUT' || row.itemKey.startsWith('tut')
}

export function planRowClassKey(row: {
  sectionId?: string
  sessionKind?: 'LEC' | 'TUT'
  itemKey: string
  tutorialFor?: string[]
}): string {
  if (isTutorialPlanRow(row)) {
    const scope = (row.tutorialFor ?? []).join('+')
    return `TUT:${scope}`
  }
  return row.sectionId ?? ''
}

export function planClassColumnText(row: {
  sectionId?: string
  sessionKind?: 'LEC' | 'TUT'
  itemKey: string
  tutorialFor?: string[]
}): string {
  if (!row.sectionId) return ''
  if (isTutorialPlanRow(row)) return formatTutClassLabel(row.tutorialFor)
  return row.sectionId
}

export function teachingPlanRowAffectsUser(
  row: {
    courseCode: string
    sectionId?: string
    sessionKind?: 'LEC' | 'TUT'
    itemKey: string
    tutorialFor?: string[]
  },
  selectedSet: Set<string>,
  selectedCourses: Set<string>,
): boolean {
  if (!row.sectionId) return selectedCourses.has(row.courseCode)
  if (isTutorialPlanRow(row)) {
    if (row.tutorialFor && row.tutorialFor.length > 0) {
      return row.tutorialFor.some(id => selectedSet.has(`${row.courseCode}::${id}`))
    }
    return selectedCourses.has(row.courseCode)
  }
  return selectedSet.has(`${row.courseCode}::${row.sectionId}`)
}
