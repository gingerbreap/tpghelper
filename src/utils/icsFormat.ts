import { calendarEventLabel, filterEventsForIcsExport, type CalendarEvent } from './calendarEvents'
import { examKindTypeLabel } from './exams'
import { getActiveProgramme } from '../programmes'

export interface IcsFormatTemplates {
  summary: string
  description: string
  finalSummary: string
  finalDescription: string
}

export const ICS_FORMAT_STORAGE_KEY = getActiveProgramme().storage.icsExportFormat

export const DEFAULT_ICS_TEMPLATES: IcsFormatTemplates = {
  summary: '@code (@type): @name @ @location',
  description:
    '[@module] @code (@class): @name (@type)\nLocation: @location\nProfessor: Prof. @prof',
  finalSummary: '@code @type @ @location',
  finalDescription: '[@module] @code (@name) @type\nLocation: @location',
}

export const CHINESE_ICS_DESCRIPTION_TEMPLATE =
  '[@module] @code (@classchn): @name (@type)\n授课地点: @location\n授课: @prof 教授'

export const CHINESE_ICS_FINAL_DESCRIPTION_TEMPLATE =
  '[@module] @code (@name) @type\n考核地点: @location'

export const ICS_PLACEHOLDERS: {
  keys: string[]
  label: string
  example: string
}[] = [
  { keys: ['@module'], label: '模块', example: 'M1' },
  { keys: ['@code'], label: '课程代码', example: 'MSBA7001' },
  { keys: ['@class', '@classchn'], label: '班别', example: 'Class A / A 班' },
  { keys: ['@name'], label: '课程名称', example: 'Python for Data Analytics' },
  {
    keys: ['@type'],
    label: '类型',
    example: 'LEC / TUT；Final Exam / Final Presentation',
  },
  { keys: ['@location'], label: '教室', example: 'LT104' },
  { keys: ['@prof'], label: '教授姓名', example: 'Chao DING' },
]

export function isIcsClassEvent(ev: CalendarEvent): boolean {
  return ev.sessionType === 'lecture' || ev.sessionType === 'tutorial'
}

export function isIcsFinalEvent(ev: CalendarEvent): boolean {
  return ev.sessionType === 'exam' || ev.sessionType === 'presentation' || ev.sessionType === 'other'
}

function sessionTypeLabel(ev: CalendarEvent): string {
  if (ev.sessionType === 'lecture') return 'LEC'
  if (ev.sessionType === 'tutorial') return 'TUT'
  if (ev.examKind) return examKindTypeLabel(ev.examKind)
  if (ev.sessionType === 'exam') return 'Final Exam'
  if (ev.sessionType === 'presentation') return 'Final Presentation'
  if (ev.sessionType === 'other') return 'Final'
  return calendarEventLabel(ev)
}

function professorShort(instructor: string): string {
  return instructor.replace(/^Prof\.\s*/i, '').trim()
}

export function buildPlaceholderMap(ev: CalendarEvent): Record<string, string> {
  return {
    '@module': `M${ev.module}`,
    '@code': ev.courseCode,
    '@class': `Class ${ev.sectionId}`,
    '@classchn': `${ev.sectionId} 班`,
    '@name': ev.courseTitle,
    '@type': sessionTypeLabel(ev),
    '@location': ev.venue || '',
    '@prof': professorShort(ev.instructor || ''),
  }
}

/** Replace placeholders; unknown tokens are left as-is. Longer keys first so @classchn beats @class. */
export function applyIcsTemplate(template: string, ev: CalendarEvent): string {
  const map = buildPlaceholderMap(ev)
  let out = template
  for (const key of Object.keys(map).sort((a, b) => b.length - a.length)) {
    out = out.split(key).join(map[key] ?? key)
  }
  return out
}

export function applyIcsEventTemplates(
  templates: IcsFormatTemplates,
  ev: CalendarEvent,
): { summary: string; description: string } {
  const classEvent = isIcsClassEvent(ev)
  return {
    summary: applyIcsTemplate(classEvent ? templates.summary : templates.finalSummary, ev),
    description: applyIcsTemplate(
      classEvent ? templates.description : templates.finalDescription,
      ev,
    ),
  }
}

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function formatIcsPreviewWhen(
  date: string,
  startTime: string,
  endTime: string,
  weekdays: string[] = WEEKDAY_CN,
): string {
  const day = new Date(`${date}T12:00:00`).getDay()
  if (startTime && endTime) return `${date} ${weekdays[day]}, ${startTime}-${endTime}`
  return `${date} ${weekdays[day]}`
}

function comparePreviewEvents(a: CalendarEvent, b: CalendarEvent): number {
  return (
    a.date.localeCompare(b.date)
    || (a.startTime || '').localeCompare(b.startTime || '')
    || a.courseCode.localeCompare(b.courseCode)
    || a.sectionId.localeCompare(b.sectionId)
  )
}

/**
 * Preview sample: first class in the earliest selected module that would be exported.
 * Prefers lecture/tutorial meetings; falls back to exams/presentations in that module.
 */
export function resolveIcsPreviewEvent(
  events: CalendarEvent[],
  modules: Set<number>,
  includeLecture: boolean,
  includeTutorial: boolean,
): CalendarEvent | null {
  if (modules.size === 0) return null
  const exported = filterEventsForIcsExport(events, modules, includeLecture, includeTutorial)
  if (exported.length === 0) return null

  const firstModule = Math.min(...exported.map(ev => ev.module))
  const inModule = exported.filter(ev => ev.module === firstModule)
  const classMeetings = inModule.filter(isIcsClassEvent)
  const candidates = classMeetings.length > 0 ? classMeetings : inModule
  return [...candidates].sort(comparePreviewEvents)[0] ?? null
}

/** First final in the earliest exported module that has a final (time, then course code). */
export function resolveIcsFinalsPreviewEvent(
  events: CalendarEvent[],
  modules: Set<number>,
  includeLecture: boolean,
  includeTutorial: boolean,
): CalendarEvent | null {
  if (modules.size === 0) return null
  const exported = filterEventsForIcsExport(events, modules, includeLecture, includeTutorial)
  const finals = exported.filter(isIcsFinalEvent)
  if (finals.length === 0) return null

  const firstModule = Math.min(...finals.map(ev => ev.module))
  const inModule = finals.filter(ev => ev.module === firstModule)
  return [...inModule].sort(comparePreviewEvents)[0] ?? null
}

type StoredIcsTemplates = Partial<IcsFormatTemplates> & {
  class?: Partial<Pick<IcsFormatTemplates, 'summary' | 'description'>>
  final?: { summary?: string; description?: string }
}

export function loadIcsTemplates(): IcsFormatTemplates {
  try {
    const raw = localStorage.getItem(ICS_FORMAT_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ICS_TEMPLATES }
    const parsed = JSON.parse(raw) as StoredIcsTemplates
    // Migrate legacy @Prof token to @prof
    const migrate = (s: string) => s.replaceAll('@Prof', '@prof')
    return {
      summary: migrate(parsed.summary ?? parsed.class?.summary ?? DEFAULT_ICS_TEMPLATES.summary),
      description: migrate(
        parsed.description ?? parsed.class?.description ?? DEFAULT_ICS_TEMPLATES.description,
      ),
      finalSummary: migrate(
        parsed.finalSummary ?? parsed.final?.summary ?? DEFAULT_ICS_TEMPLATES.finalSummary,
      ),
      finalDescription: migrate(
        parsed.finalDescription ?? parsed.final?.description ?? DEFAULT_ICS_TEMPLATES.finalDescription,
      ),
    }
  } catch {
    return { ...DEFAULT_ICS_TEMPLATES }
  }
}

export function saveIcsTemplates(templates: IcsFormatTemplates): void {
  localStorage.setItem(ICS_FORMAT_STORAGE_KEY, JSON.stringify(templates))
}
