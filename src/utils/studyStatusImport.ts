import type { Course, SelectedSection } from '../types'
import { formatSectionInstructors } from './instructors'
import { getActiveProgramme } from '../programmes'
import type { MeconStreamId } from '../programmes/mecon/streamTags'
import {
  defaultSelectionType,
  getMeconCourseView,
  isMeconStreamCoreForStream,
} from './meconCourseView'

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

export type MeconBootcampChoice = 'none' | 'A' | 'B'

export interface MeconStreamCoreChoiceItem {
  courseCode: string
  module: number
  sectionId: string
  courseTitle: string
  /** Default suggested type before user overrides. */
  defaultType: 'Stream Core' | 'Elective'
}

export interface StudyStatusImportResult {
  /** Matched courses ready to import (same order as recognized). */
  selections: SelectedSection[]
  /** Matched courses with Study Status kind for the recognition list. */
  recognized: RecognizedStudyStatusItem[]
  parsedCount: number
  unmatched: ImportedStudyStatusItem[]
  duplicateCourseCodes: string[]
  /** Mecon: only Part II of ECON6067 found (no Bootcamp / Part I). */
  meconNeedsBootcampPrompt?: boolean
  /** Mecon: courses that should ask Stream Core vs Elective. */
  meconStreamCoreChoices?: MeconStreamCoreChoiceItem[]
}

function detectStatus(block: string): StudyStatusKind | null {
  if (/\bWaiting\b/i.test(block)) return 'Waiting'
  if (/\bRegistered\b/i.test(block)) return 'Registered'
  return null
}

function parsePeriodToken(raw: string, isMecon: boolean): number | null {
  const text = raw.trim()
  if (isMecon) {
    if (/^bootcamp\b/i.test(text) || /^summer(?:\s+bootcamp)?\b/i.test(text)) return 0
    if (/^semester\s*(?:1|i)\b/i.test(text)) return 11
    if (/^semester\s*(?:2|ii)\b/i.test(text)) return 12
  }
  const mod = /^module\s+(\d+)\b/i.exec(text)
  if (!mod) return null
  return Number(mod[1])
}

function resolveMeconCourseModule(
  courses: Course[],
  courseCode: string,
  sectionId: string,
  reportedModule: number,
): Course | undefined {
  const exact = courses.find(
    c => c.courseCode === courseCode && c.module === reportedModule,
  )
  if (exact?.sections.some(s => s.sectionId === sectionId)) return exact

  const alts = courses.filter(
    c => c.courseCode === courseCode && c.sections.some(s => s.sectionId === sectionId),
  )
  if (alts.length === 0) return undefined
  if (alts.length === 1) return alts[0]

  const prefer =
    reportedModule === 0
      ? 0
      : reportedModule === 11 || reportedModule === 1 || reportedModule === 2
        ? 11
        : reportedModule === 12 || reportedModule === 4 || reportedModule === 5
          ? 12
          : reportedModule
  return alts.find(c => c.module === prefer) ?? alts.find(c => c.module === reportedModule) ?? alts[0]
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
  const isMecon = programme.id === 'mecon'
  const code = programme.studyStatus.courseCodePattern
  const maxModule = programme.moduleCount
  const body = text
    .slice(startMatch.index + startMatch[0].length)
    .split(/\bSummary\b/i)[0]
    .replace(/\r\n?/g, '\n')

  const periodAlt = isMecon
    ? String.raw`(?:Module\s+[0-9]+|Semester\s*(?:1|2|I|II)|Bootcamp|Summer(?:\s+Bootcamp)?)`
    : String.raw`Module\s+[1-${maxModule}]`

  const pattern = new RegExp(
    String.raw`\b(${code})\s*\n\s*([A-Z])\s*\n\s*20\d{2}-20\d{2}\s*\n\s*(${periodAlt})\b([\s\S]*?)(?=\b(?:${code})\s*\n|\bSummary\b|$)`,
    'gi',
  )
  const items: ImportedStudyStatusItem[] = []

  for (const match of body.matchAll(pattern)) {
    const status = detectStatus(match[4])
    if (!status) continue
    const module = parsePeriodToken(match[3], isMecon)
    if (module == null) continue
    if (!isMecon && (module < 1 || module > maxModule)) continue
    items.push({
      courseCode: match[1].toUpperCase(),
      sectionId: match[2].toUpperCase(),
      module,
      status,
    })
  }

  return items
}

export function resolveStudyStatusImport(
  text: string,
  courses: Course[],
  stream: MeconStreamId | null = null,
): StudyStatusImportResult {
  const parsed = parseStudyStatus(text)
  const recognized: RecognizedStudyStatusItem[] = []
  const unmatched: ImportedStudyStatusItem[] = []
  const programme = getActiveProgramme()
  const isMecon = programme.id === 'mecon'
  const allowMultiModule = programme.features.enrollmentRules
  const seenKeys = new Set<string>()
  const duplicateCourseCodes: string[] = []

  for (const item of parsed) {
    const course = isMecon
      ? resolveMeconCourseModule(courses, item.courseCode, item.sectionId, item.module)
      : courses.find(
          c => c.courseCode === item.courseCode && c.module === item.module,
        )
    const section = course?.sections.find(s => s.sectionId === item.sectionId)

    if (!course || !section) {
      unmatched.push(item)
      continue
    }

    const dedupeKey = allowMultiModule
      ? `${item.courseCode}-M${course.module}`
      : item.courseCode
    if (seenKeys.has(dedupeKey)) {
      duplicateCourseCodes.push(item.courseCode)
      continue
    }
    seenKeys.add(dedupeKey)

    const courseType = isMecon
      ? defaultSelectionType(course, stream)
      : course.courseType

    recognized.push({
      status: item.status,
      selection: {
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        module: course.module,
        courseType,
        sectionId: section.sectionId,
        instructor: formatSectionInstructors(section),
        status: item.status === 'Waiting' ? 'waitlist' : 'registered',
      },
    })
  }

  const selections = recognized.map(r => r.selection)
  let meconNeedsBootcampPrompt = false
  let meconStreamCoreChoices: MeconStreamCoreChoiceItem[] | undefined

  if (isMecon) {
    const has6067PartI = selections.some(s => s.courseCode === 'ECON6067' && s.module === 0)
    const has6067PartII = selections.some(s => s.courseCode === 'ECON6067' && s.module === 1)
    meconNeedsBootcampPrompt = has6067PartII && !has6067PartI

    const scSelections = selections.filter(s => {
      const course = courses.find(c => c.courseCode === s.courseCode && c.module === s.module)
      if (!course) return s.courseType === 'Stream Core'
      return isMeconStreamCoreForStream(course, stream) || s.courseType === 'Stream Core'
    })

    const choiceKeys = new Set<string>()
    const choices: MeconStreamCoreChoiceItem[] = []

    const pushChoice = (s: SelectedSection) => {
      const key = `${s.courseCode}-${s.module}-${s.sectionId}`
      if (choiceKeys.has(key)) return
      choiceKeys.add(key)
      const course = courses.find(c => c.courseCode === s.courseCode && c.module === s.module)
      const view = course ? getMeconCourseView(course, stream) : null
      const canSc = !!view?.ownRoles.includes('Stream Core')
      if (!canSc && s.courseCode !== 'ECON6078') return
      choices.push({
        courseCode: s.courseCode,
        module: s.module,
        sectionId: s.sectionId,
        courseTitle: s.courseTitle,
        defaultType: 'Stream Core',
      })
    }

    for (const s of selections) {
      if (s.courseCode === 'ECON6078') pushChoice(s)
    }
    if (scSelections.length > 3) {
      for (const s of scSelections) pushChoice(s)
    }
    if (choices.length > 0) meconStreamCoreChoices = choices
  }

  return {
    selections,
    recognized,
    parsedCount: parsed.length,
    unmatched,
    duplicateCourseCodes: [...new Set(duplicateCourseCodes)],
    meconNeedsBootcampPrompt,
    meconStreamCoreChoices,
  }
}

/** Apply Mecon import answers (Bootcamp + Stream Core/Elective choices). */
export function applyMeconStudyStatusAnswers(
  result: StudyStatusImportResult,
  courses: Course[],
  bootcamp: MeconBootcampChoice,
  streamCoreTypes: Record<string, 'Stream Core' | 'Elective'>,
): SelectedSection[] {
  let next = result.selections.map(s => {
    const key = `${s.courseCode}-${s.module}-${s.sectionId}`
    const override = streamCoreTypes[key]
    return override ? { ...s, courseType: override } : s
  })

  if (result.meconNeedsBootcampPrompt && bootcamp !== 'none') {
    const boot = courses.find(c => c.courseCode === 'ECON6067' && c.module === 0)
    const section = boot?.sections.find(s => s.sectionId === bootcamp)
    const partII = next.find(s => s.courseCode === 'ECON6067' && s.module === 1)
    if (boot && section && partII) {
      const already = next.some(s => s.courseCode === 'ECON6067' && s.module === 0)
      if (!already) {
        next = [
          {
            courseCode: boot.courseCode,
            courseTitle: boot.courseTitle,
            module: 0,
            courseType: partII.courseType,
            sectionId: section.sectionId,
            instructor: formatSectionInstructors(section),
            status: partII.status ?? 'registered',
          },
          ...next,
        ]
      }
    }
  }

  return next
}
