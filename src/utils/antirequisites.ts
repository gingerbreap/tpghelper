import type { EnrollmentRule } from '../types'
import type { Locale } from '../i18n/types'

function isZhLocale(locale: Locale): boolean {
  return locale === 'zh-CN' || locale === 'zh-HK'
}

export interface AntirequisiteCheckResult {
  ok: boolean
  /** Conflicting codes already in the plan (Y). */
  blocking: string[]
}

export function antirequisiteRules(rules: EnrollmentRule[]): EnrollmentRule[] {
  return rules.filter(
    r => r.type === 'antirequisite' && r.courseCode && (r.whenSelected?.length ?? 0) > 0,
  )
}

/** Y codes from rules for course X that are already in selectedCodes. */
export function checkAntirequisiteForCourse(
  courseCode: string,
  selectedCodes: Set<string>,
  rules: EnrollmentRule[],
): AntirequisiteCheckResult {
  const blocking = new Set<string>()
  for (const rule of antirequisiteRules(rules)) {
    if (rule.courseCode !== courseCode) continue
    for (const y of rule.whenSelected ?? []) {
      if (selectedCodes.has(y)) blocking.add(y)
    }
  }
  const list = [...blocking].sort()
  return { ok: list.length === 0, blocking: list }
}

export function formatAntirequisiteBlockMessage(
  courseCode: string,
  blocking: string[],
  locale: Locale,
): string {
  const zh = isZhLocale(locale)
  const y = blocking.join(zh ? '、' : ', ')
  if (zh) {
    return `${courseCode}对已选${y}的学生不开放`
  }
  if (blocking.length === 1) {
    return `${courseCode} cannot be selected when ${y} has been chosen`
  }
  return `${courseCode} cannot be selected when any of ${y} has been chosen`
}
