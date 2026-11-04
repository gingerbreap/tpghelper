import { countEffectiveSelections } from '../hooks/useSelections'
import type { EnrollmentRule, SelectedSection } from '../types'

/** All programmes may select at most this many Common Elective courses. */
export const COMMON_ELECTIVE_MAX = 2

export function isCommonElectiveSelection(
  s: Pick<SelectedSection, 'courseType'>,
): boolean {
  return s.courseType === 'Common Elective'
}

export function countCommonElectiveSelections(
  selections: SelectedSection[],
  enrollmentRules: EnrollmentRule[] = [],
  useEnrollmentRules = false,
): number {
  const ce = selections.filter(isCommonElectiveSelection)
  return useEnrollmentRules
    ? countEffectiveSelections(ce, enrollmentRules)
    : ce.length
}

/** True when adding this CE would exceed the cap (already-selected rows are allowed). */
export function isCommonElectiveCapBlocked(
  candidate: Pick<SelectedSection, 'courseType'>,
  selections: SelectedSection[],
  opts: {
    alreadySelected: boolean
    enrollmentRules?: EnrollmentRule[]
    useEnrollmentRules?: boolean
  },
): boolean {
  if (opts.alreadySelected || !isCommonElectiveSelection(candidate)) return false
  return (
    countCommonElectiveSelections(
      selections,
      opts.enrollmentRules ?? [],
      opts.useEnrollmentRules ?? false,
    ) >= COMMON_ELECTIVE_MAX
  )
}
