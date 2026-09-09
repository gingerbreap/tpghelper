import { useState, useEffect, useCallback } from 'react'
import type { EnrollmentRule, SelectedSection } from '../types'
import { getActiveProgramme } from '../programmes'
import type { Locale } from '../i18n/types'

export const SELECTIONS_STORAGE_KEY = getActiveProgramme().storage.selections
const STORAGE_KEY = SELECTIONS_STORAGE_KEY

export type ToggleResult = 'added' | 'removed' | 'duplicate'

export interface ModuleConflict {
  conflictingCode: string
  message: string
}

export interface SameCourseBlock {
  sectionId: string
  module: number
}

function isZhLocale(locale: Locale): boolean {
  return locale === 'zh-CN' || locale === 'zh-HK'
}

/** Pick EN/ZH copy from an enrollment rule (JSON + i18n fallbacks). */
export function formatEnrollmentRuleMessage(
  rule: EnrollmentRule,
  locale: Locale,
): string {
  const zh = isZhLocale(locale)
  if (zh && rule.messageZh) return rule.messageZh
  if (!zh && rule.message) return rule.message
  if (rule.messageZh) return rule.messageZh
  if (rule.message) return rule.message

  if (rule.type === 'allowMultiModule') {
    const modules = (rule.modules ?? []).join(zh ? '、' : ', ')
    return zh
      ? `${rule.courseCode}（Module ${modules}）`
      : `${rule.courseCode} (Module ${modules})`
  }
  const courses = (rule.courses ?? []).join(zh ? ' 与 ' : ' / ')
  return zh
    ? `同一 Module 内 ${courses} 只能选其一`
    : `Within the same module, only one of ${courses} may be selected`
}

export function allowsMultiModuleSelection(
  courseCode: string,
  module: number,
  otherModule: number,
  rules: EnrollmentRule[] = [],
): boolean {
  if (module === otherModule) return false
  return rules.some(
    rule =>
      rule.type === 'allowMultiModule' &&
      rule.courseCode === courseCode &&
      (rule.modules ?? []).includes(module) &&
      (rule.modules ?? []).includes(otherModule),
  )
}

export function getSameCourseBlockReason(
  courseCode: string,
  module: number,
  sectionId: string,
  selections: SelectedSection[],
  rules: EnrollmentRule[] = [],
  isCurrentlySelected = false,
): SameCourseBlock | null {
  if (isCurrentlySelected) return null

  for (const existing of selections.filter(s => s.courseCode === courseCode)) {
    if (existing.module === module) {
      if (existing.sectionId !== sectionId) {
        return { sectionId: existing.sectionId, module: existing.module }
      }
      continue
    }
    if (!allowsMultiModuleSelection(courseCode, module, existing.module, rules)) {
      return { sectionId: existing.sectionId, module: existing.module }
    }
  }
  return null
}

export function linkedSingleCourseCodes(rules: EnrollmentRule[] = []): Set<string> {
  return new Set(
    rules
      .filter(r => r.type === 'allowMultiModule' && r.countsAsOneCourse && r.courseCode)
      .map(r => r.courseCode!),
  )
}

/** Count selections, treating linked multi-module courses (e.g. PMGM7016 M1+M3) as one. */
export function countEffectiveSelections(
  selections: SelectedSection[],
  rules: EnrollmentRule[] = [],
): number {
  const linked = linkedSingleCourseCodes(rules)
  let total = 0
  const seenLinked = new Set<string>()
  for (const s of selections) {
    if (linked.has(s.courseCode)) {
      if (!seenLinked.has(s.courseCode)) {
        seenLinked.add(s.courseCode)
        total += 1
      }
    } else {
      total += 1
    }
  }
  return total
}

export function getModuleConflict(
  courseCode: string,
  module: number,
  selections: SelectedSection[],
  rules: EnrollmentRule[] = [],
  locale: Locale = 'zh-CN',
): ModuleConflict | null {
  for (const rule of rules) {
    if (rule.type !== 'mutualExclusion' || rule.scope !== 'module') continue
    if (!rule.courses?.includes(courseCode)) continue

    for (const otherCode of rule.courses) {
      if (otherCode === courseCode) continue
      const existing = selections.find(s => s.courseCode === otherCode && s.module === module)
      if (existing) {
        return {
          conflictingCode: otherCode,
          message: formatEnrollmentRuleMessage(rule, locale),
        }
      }
    }
  }
  return null
}

/** Display order: Core → Elective → Capstone, then course code, then module. */
export function sortSelectionsForDisplay(selections: SelectedSection[]): SelectedSection[] {
  const typeOrder: Record<string, number> = { Core: 0, Elective: 1, Capstone: 2 }
  return [...selections].sort((a, b) => {
    const byType = (typeOrder[a.courseType] ?? 99) - (typeOrder[b.courseType] ?? 99)
    if (byType !== 0) return byType
    const byCode = a.courseCode.localeCompare(b.courseCode)
    if (byCode !== 0) return byCode
    return a.module - b.module
  })
}

function load(): SelectedSection[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function useSelections(enrollmentRules: EnrollmentRule[] = []) {
  const [selections, setSelections] = useState<SelectedSection[]>(load)
  const rulesEnabled = getActiveProgramme().features.enrollmentRules
  const effectiveRules = rulesEnabled ? enrollmentRules : []

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
  }, [selections])

  const getForCourseCode = useCallback((courseCode: string) => {
    return selections.find(s => s.courseCode === courseCode)
  }, [selections])

  const toggle = useCallback((s: SelectedSection): ToggleResult => {
    let result: ToggleResult = 'added'
    setSelections(prev => {
      const existsExact = prev.some(
        p => p.courseCode === s.courseCode && p.module === s.module && p.sectionId === s.sectionId,
      )

      if (existsExact) {
        result = 'removed'
        return prev.filter(
          p => !(p.courseCode === s.courseCode && p.module === s.module && p.sectionId === s.sectionId),
        )
      }

      for (const existing of prev.filter(p => p.courseCode === s.courseCode)) {
        if (existing.module === s.module) {
          result = 'duplicate'
          return prev
        }
        if (!allowsMultiModuleSelection(s.courseCode, s.module, existing.module, effectiveRules)) {
          result = 'duplicate'
          return prev
        }
      }

      result = 'added'
      return [...prev, s]
    })
    return result
  }, [effectiveRules])

  const isSelected = useCallback((courseCode: string, module: number, sectionId: string) => {
    return selections.some(s => s.courseCode === courseCode && s.module === module && s.sectionId === sectionId)
  }, [selections])

  const clear = useCallback(() => setSelections([]), [])

  /** Replace the plan after a successful import from HKU Business School CES. */
  const replace = useCallback((nextSelections: SelectedSection[]) => {
    setSelections(nextSelections)
  }, [])

  return { selections, toggle, isSelected, getForCourseCode, clear, replace }
}
