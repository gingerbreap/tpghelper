import type { EnrollmentRule } from '../types'

/** Rules that constrain selecting / counting this course code. */
export function enrollmentRulesForCourse(
  courseCode: string,
  rules: EnrollmentRule[] | undefined,
): EnrollmentRule[] {
  if (!rules?.length) return []
  return rules.filter(rule => {
    if (rule.courseCode === courseCode) return true
    if (rule.courses?.includes(courseCode)) return true
    return false
  })
}
