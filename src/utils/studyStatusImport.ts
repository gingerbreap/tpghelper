import type { Course, SelectedSection } from '../types'
import { formatSectionInstructors } from './instructors'
import { getActiveProgramme } from '../programmes'

export interface ImportedStudyStatusItem {
  courseCode: string
  sectionId: string
  module: number
}

export interface StudyStatusImportResult {
  selections: SelectedSection[]
  parsedCount: number
  unmatched: ImportedStudyStatusItem[]
  duplicateCourseCodes: string[]
}

/**
 * Extract registered course rows from text copied from HKU Business School's
 * Study Status page. Text outside Study Status / Study Plan is ignored, as is
 * everything after the Summary heading.
 */
export function parseStudyStatus(text: string): ImportedStudyStatusItem[] {
  const startMatch = /(?:Study\s+Status|Study\s+Plan)\b/i.exec(text)
  if (!startMatch) return []

  const programme = getActiveProgramme()
  const code = programme.studyStatus.courseCodePattern
  const maxModule = programme.moduleCount
  const body = text
    .slice(startMatch.index + startMatch[0].length)
    .split(/\bSummary\b/i)[0]
    .replace(/\r\n?/g, '\n')

  const pattern = new RegExp(
    String.raw`\b(${code})\s*\n\s*([A-Z])\s*\n\s*20\d{2}-20\d{2}\s*\n\s*Module\s+([1-${maxModule}])\b([\s\S]*?)(?=\b(?:${code})\s*\n|\bSummary\b|$)`,
    'gi',
  )
  const items: ImportedStudyStatusItem[] = []

  for (const match of body.matchAll(pattern)) {
    if (!/\bRegistered\b/i.test(match[4])) continue
    items.push({
      courseCode: match[1].toUpperCase(),
      sectionId: match[2].toUpperCase(),
      module: Number(match[3]),
    })
  }

  return items
}

export function resolveStudyStatusImport(
  text: string,
  courses: Course[],
): StudyStatusImportResult {
  const parsed = parseStudyStatus(text)
  const selections: SelectedSection[] = []
  const unmatched: ImportedStudyStatusItem[] = []
  const allowMultiModule = getActiveProgramme().features.enrollmentRules
  const seenKeys = new Set<string>()
  const duplicateCourseCodes: string[] = []

  for (const item of parsed) {
    const course = courses.find(
      c => c.courseCode === item.courseCode && c.module === item.module,
    )
    const section = course?.sections.find(s => s.sectionId === item.sectionId)

    if (!course || !section) {
      unmatched.push(item)
      continue
    }

    const dedupeKey = allowMultiModule
      ? `${item.courseCode}-M${item.module}`
      : item.courseCode
    if (seenKeys.has(dedupeKey)) {
      duplicateCourseCodes.push(item.courseCode)
      continue
    }
    seenKeys.add(dedupeKey)

    selections.push({
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      module: course.module,
      courseType: course.courseType,
      sectionId: section.sectionId,
      instructor: formatSectionInstructors(section),
    })
  }

  return {
    selections,
    parsedCount: parsed.length,
    unmatched,
    duplicateCourseCodes: [...new Set(duplicateCourseCodes)],
  }
}
