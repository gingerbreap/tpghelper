import type { Course, ExamKind, SelectedSection } from '../types'
import { examEventTitle, examSessionType, resolveExam } from './exams'
import { formatSectionInstructors, meetingInstructorNames } from './instructors'

export type CalendarSessionType = 'lecture' | 'tutorial' | 'exam' | 'presentation' | 'other'

export interface CalendarEvent {
  id: string
  date: string
  startTime: string
  endTime: string
  courseCode: string
  courseTitle: string
  sectionId: string
  instructor: string
  venue: string
  sessionType: CalendarSessionType
  module: number
  examKind?: ExamKind
  /** 1-based index within LEC or TUT meetings for this section (omitted for finals). */
  sessionNumber?: number
  /**
   * Teaching Plan revision overlay:
   * - previous: ghost of the old session (hatch + faded)
   * - updated: current session that was part of a TP change
   */
  planRevision?: 'previous' | 'updated'
  /** Links previous/updated events to a navigable PlanChange (display row key). */
  planChangeId?: string
}

export function buildCalendarEvents(
  selections: SelectedSection[],
  courses: Course[],
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const sel of selections) {
    const course = courses.find(c => c.courseCode === sel.courseCode && c.module === sel.module)
    const section = course?.sections.find(s => s.sectionId === sel.sectionId)
    if (!course || !section) continue

    const fallbackInstructor = formatSectionInstructors(section)
    let lectureNo = 0
    let tutorialNo = 0

    for (const meeting of section.meetings) {
      const names = meetingInstructorNames(section, meeting)
      const sessionNumber =
        meeting.sessionType === 'lecture' ? ++lectureNo : ++tutorialNo
      events.push({
        id: `${sel.courseCode}-M${sel.module}-${sel.sectionId}-${meeting.date}-${meeting.startTime}-${meeting.sessionType}`,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        courseCode: sel.courseCode,
        courseTitle: course.courseTitle,
        sectionId: sel.sectionId,
        instructor: names.length ? names.join(' / ') : fallbackInstructor,
        venue: meeting.venue,
        sessionType: meeting.sessionType,
        module: course.module,
        sessionNumber,
      })
    }

    const exam = resolveExam(course, section)
    if (exam?.date) {
      const sessionType = examSessionType(exam.kind)
      events.push({
        id: `${sel.courseCode}-M${sel.module}-${sel.sectionId}-${exam.date}-${exam.startTime || 'allday'}-${sessionType}`,
        date: exam.date,
        startTime: exam.startTime || '',
        endTime: exam.endTime || '',
        courseCode: sel.courseCode,
        courseTitle: course.courseTitle,
        sectionId: sel.sectionId,
        instructor: '',
        venue: exam.venue || '',
        sessionType,
        module: course.module,
        examKind: exam.kind,
      })
    }
  }

  return events.sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  )
}

export function eventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    ;(map[ev.date] ||= []).push(ev)
  }
  return map
}

export function filterEventsForIcsExport(
  events: CalendarEvent[],
  modules: Set<number>,
  includeLecture: boolean,
  includeTutorial: boolean,
): CalendarEvent[] {
  return events.filter(ev => {
    if (!modules.has(ev.module)) return false
    if (ev.sessionType === 'lecture') return includeLecture
    if (ev.sessionType === 'tutorial') return includeTutorial
    return true
  })
}

export function calendarEventLabel(event: CalendarEvent): string {
  if (event.sessionType === 'lecture') return `${event.courseCode} LEC`
  if (event.sessionType === 'tutorial') return `${event.courseCode} TUT`
  return examEventTitle(event.courseCode, event.examKind ?? 'other')
}
