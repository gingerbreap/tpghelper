import type { Course, SelectedSection } from '../types'
import { formatSectionInstructors } from './instructors'
import { getActiveProgramme } from '../programmes'

export type StudyStatusKind = 'Registered' | 'Waiting'

export interface ImportedStudyStatusItem {
  courseCode: string
  sectionId: string
  module: number
  status: StudyStatusKind
}

export interface RecognizedStudyStatusItem {
  selection: SelectedSection
  status: StudyStatusKind
}

export interface StudyStatusImportResult {
  /** Matched courses ready to import (same order as recognized). */
  selections: SelectedSection[]
  /** Matched courses with Study Status kind for the recognition list. */
  recognized: RecognizedStudyStatusItem[]
  parsedCount: number
  unmatched: ImportedStudyStatusItem[]
  duplicateCourseCodes: string[]
}

function detectStatus(block: string): StudyStatusKind | null {
  if (/\bWaiting\b/i.test(block)) return 'Waiting'
  if (/\bRegistered\b/i.test(block)) return 'Registered'
  return null
}

/**
 * Extract course rows from text copied from HKU Business School's Study Status
 * page. Accepts Registered and Waiting. Text outside Study Status / Study Plan
 * is ignored, as is everything after the Summary heading.
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
    const status = detectStatus(match[4])
    if (!status) continue
    items.push({
      courseCode: match[1].toUpperCase(),
      sectionId: match[2].toUpperCase(),
      module: Number(match[3]),
      status,
    })
  }

  return items
}

export function resolveStudyStatusImport(
  text: string,
  courses: Course[],
): StudyStatusImportResult {
  const parsed = parseStudyStatus(text)
  const recognized: RecognizedStudyStatusItem[] = []
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

    recognized.push({
      status: item.status,
      selection: {
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        module: course.module,
        courseType: course.courseType,
        sectionId: section.sectionId,
        instructor: formatSectionInstructors(section),
      },
    })
  }

  return {
    selections: recognized.map(r => r.selection),
    recognized,
    parsedCount: parsed.length,
    unmatched,
    duplicateCourseCodes: [...new Set(duplicateCourseCodes)],
  }
}
