import type { EnrollmentRule, SelectedSection } from '../types'

export interface PrerequisiteCheckResult {
  ok: boolean
  missing: string[]
}

export function prerequisiteRules(rules: EnrollmentRule[]): EnrollmentRule[] {
  return rules.filter(r => r.type === 'prerequisite' && r.courseCode)
}

export function hasPrerequisiteRules(rules: EnrollmentRule[]): boolean {
  return prerequisiteRules(rules).length > 0
}

/** Prerequisite codes declared for `courseCode` in requirements enrollmentRules. */
export function requiresForCourse(courseCode: string, rules: EnrollmentRule[]): string[] {
  const rule = prerequisiteRules(rules).find(r => r.courseCode === courseCode)
  if (!rule?.requires?.length) return []
  return [...new Set(rule.requires)]
}

export function selectedCourseCodes(selections: SelectedSection[]): Set<string> {
  return new Set(selections.map(s => s.courseCode))
}

/**
 * Stub policy: every code in `requires` must appear in selectedCodes.
 * Future: OR-groups, registered-only, module-scoped prereqs, etc.
 */
export function checkPrerequisitesForCourse(
  courseCode: string,
  selectedCodes: Set<string>,
  rules: EnrollmentRule[],
): PrerequisiteCheckResult {
  const requires = requiresForCourse(courseCode, rules)
  if (requires.length === 0) return { ok: true, missing: [] }
  const missing = requires.filter(code => !selectedCodes.has(code))
  return { ok: missing.length === 0, missing }
}

/** Whether a selected row still violates its prerequisite rule (e.g. prereq was dropped). */
export function selectionMissingPrerequisites(
  selection: Pick<SelectedSection, 'courseCode'>,
  selections: SelectedSection[],
  rules: EnrollmentRule[],
): PrerequisiteCheckResult {
  const codes = selectedCourseCodes(selections)
  return checkPrerequisitesForCourse(selection.courseCode, codes, rules)
}
