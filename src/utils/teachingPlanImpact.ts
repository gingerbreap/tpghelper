import {
  buildDisplayRows,
  isTutorialPlanRow,
  teachingPlanNotices,
  teachingPlanRowAffectsUser,
  type ChangePart,
  type TeachingPlanDisplayRow,
} from '../data/teachingPlanUpdates'
import type { CalendarEvent, CalendarSessionType } from './calendarEvents'
import type { Course, SelectedSection } from '../types'

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const DEFAULT_YEAR = 2026

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Parse Teaching Plan notice date text → YYYY-MM-DD */
export function parseNoticeDateToIso(text: string, defaultYear = DEFAULT_YEAR): string | null {
  const match = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,\s*(\d{4}))?/i,
  )
  if (!match) return null
  const month = MONTHS[match[1].toLowerCase()]
  if (!month) return null
  const day = Number(match[2])
  const year = match[3] ? Number(match[3]) : defaultYear
  if (!day || day < 1 || day > 31) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

function parseTimeRange(text: string): { start: string, end: string } | null {
  const match = text.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
  if (!match) return null
  return { start: match[1], end: match[2] }
}

function selectedKey(courseCode: string, sectionId: string): string {
  return `${courseCode}::${sectionId}`
}

export function rowAffectsUser(
  row: TeachingPlanDisplayRow,
  selections: SelectedSection[],
): boolean {
  const selectedSet = new Set(selections.map(s => selectedKey(s.courseCode, s.sectionId)))
  const selectedCourses = new Set(selections.map(s => s.courseCode))
  return teachingPlanRowAffectsUser(row, selectedSet, selectedCourses)
}

function inferSessionType(row: TeachingPlanDisplayRow): CalendarSessionType {
  if (isTutorialPlanRow(row)) {
    return 'tutorial'
  }
  return 'lecture'
}

function displaySectionId(row: TeachingPlanDisplayRow): string {
  return row.sectionId && row.sectionId !== '—' ? row.sectionId : ''
}

function uniqueInOrder(dates: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of dates) {
    if (seen.has(d)) continue
    seen.add(d)
    out.push(d)
  }
  return out
}

function collectRowDates(row: TeachingPlanDisplayRow): {
  previousDates: string[]
  updatedDates: string[]
} {
  const previousDates: string[] = []
  const updatedDates: string[] = []

  for (const part of row.previous) {
    const date = parseNoticeDateToIso(part.text)
    if (date) previousDates.push(date)
  }
  for (const part of row.updated) {
    const date = parseNoticeDateToIso(part.text)
    if (date) updatedDates.push(date)
  }

  // Same-day clock-only change: invent previous/updated on itemDate
  const clockOnlyPrevious =
    previousDates.length === 0
    && row.previous.every(p => !parseNoticeDateToIso(p.text))
    && row.previous.some(p => parseTimeRange(p.text))
    && !!row.itemDate

  if (clockOnlyPrevious) {
    const date = parseNoticeDateToIso(row.itemDate!)
    if (date) {
      previousDates.push(date)
      if (updatedDates.length === 0) updatedDates.push(date)
    }
  }

  // Venue-only (or similar) with itemDate: treat itemDate as the updated session day
  if (updatedDates.length === 0 && row.itemDate) {
    const date = parseNoticeDateToIso(row.itemDate)
    if (date) updatedDates.push(date)
  }

  return {
    previousDates: uniqueSorted(previousDates),
    updatedDates: uniqueSorted(updatedDates),
  }
}

function uniqueSorted(dates: string[]): string[] {
  return [...new Set(dates)].sort()
}

/**
 * One navigable calendar impact unit = one Teaching Plan display row that
 * affects the user's selections and has at least one dated previous/updated session.
 */
export interface PlanChange {
  id: string
  noticeId: string
  courseCode: string
  sectionId: string
  tutorialFor?: string[]
  sessionType: CalendarSessionType
  previousDates: string[]
  updatedDates: string[]
  /** Previous→updated unique dates (for off-view jump hints) */
  relatedDates: string[]
  /** Earliest related date — used for sort order and default month jump */
  sortDate: string
}

export interface PlanImpactMeta {
  changes: PlanChange[]
  updatedDates: Set<string>
  focusDate: string | null
  previousEventCount: number
  updatedEventCount: number
}

function noticesToScan(unreadNoticeIds?: Set<string>) {
  if (!unreadNoticeIds) return teachingPlanNotices
  return teachingPlanNotices.filter(n => unreadNoticeIds.has(n.id))
}

export function buildPlanChanges(
  selections: SelectedSection[],
  unreadNoticeIds?: Set<string>,
): PlanChange[] {
  if (selections.length === 0) return []

  const changes: PlanChange[] = []

  for (const notice of noticesToScan(unreadNoticeIds)) {
    for (const row of buildDisplayRows(notice)) {
      if (!rowAffectsUser(row, selections)) continue
      const { previousDates, updatedDates } = collectRowDates(row)
      // Footer order: previous date(s) → updated date(s); sortDate = earliest overall
      const relatedDates = uniqueInOrder([...previousDates, ...updatedDates])
      if (relatedDates.length === 0) continue

      const sortDate = uniqueSorted(relatedDates)[0]

      changes.push({
        id: row.key,
        noticeId: notice.id,
        courseCode: row.courseCode,
        sectionId: displaySectionId(row),
        tutorialFor: row.tutorialFor,
        sessionType: inferSessionType(row),
        previousDates,
        updatedDates,
        relatedDates,
        sortDate,
      })
    }
  }

  return changes.sort((a, b) =>
    a.sortDate.localeCompare(b.sortDate)
    || a.courseCode.localeCompare(b.courseCode)
    || a.id.localeCompare(b.id),
  )
}

/**
 * Ghost calendar events for the *previous* schedule of unread Teaching Plan
 * changes that affect the user's selections. Rendered with hatch + lower opacity.
 */
export function buildPlanPreviousEvents(
  selections: SelectedSection[],
  courses: Course[],
  unreadNoticeIds?: Set<string>,
): CalendarEvent[] {
  if (selections.length === 0) return []

  const ghosts: CalendarEvent[] = []
  const seen = new Set<string>()

  for (const notice of noticesToScan(unreadNoticeIds)) {
    for (const row of buildDisplayRows(notice)) {
      if (!rowAffectsUser(row, selections)) continue

      const sel = selections.find(s => s.courseCode === row.courseCode)
      const course = courses.find(c =>
        c.courseCode === row.courseCode && (!sel || c.module === sel.module),
      ) ?? courses.find(c => c.courseCode === row.courseCode)

      const sectionId = displaySectionId(row)
      const sessionType = inferSessionType(row)
      const module = course?.module ?? sel?.module ?? 0
      const courseTitle = course?.courseTitle ?? row.courseTitle
      const planChangeId = row.key

      const previousParts = row.previous.length > 0 ? row.previous : []
      // Same-day clock-only change: invent a previous slot on itemDate
      if (
        previousParts.every(p => !parseNoticeDateToIso(p.text))
        && row.itemDate
      ) {
        const date = parseNoticeDateToIso(row.itemDate)
        const times = previousParts.map(p => parseTimeRange(p.text)).find(Boolean)
        if (date) {
          pushGhost(ghosts, seen, {
            noticeId: notice.id,
            planChangeId,
            courseCode: row.courseCode,
            courseTitle,
            sectionId,
            module,
            sessionType,
            date,
            startTime: times?.start ?? '',
            endTime: times?.end ?? '',
            venue: '',
          })
        }
        continue
      }

      for (const part of previousParts) {
        const date = parseNoticeDateToIso(part.text)
        if (!date) continue
        const times = parseTimeRange(part.text)
        pushGhost(ghosts, seen, {
          noticeId: notice.id,
          planChangeId,
          courseCode: row.courseCode,
          courseTitle,
          sectionId,
          module,
          sessionType,
          date,
          startTime: times?.start ?? '',
          endTime: times?.end ?? '',
          venue: '',
        })
      }
    }
  }

  return ghosts.sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  )
}

function pushGhost(
  ghosts: CalendarEvent[],
  seen: Set<string>,
  args: {
    noticeId: string
    planChangeId: string
    courseCode: string
    courseTitle: string
    sectionId: string
    module: number
    sessionType: CalendarSessionType
    date: string
    startTime: string
    endTime: string
    venue: string
  },
) {
  const id = `plan-prev-${args.noticeId}-${args.courseCode}-${args.sectionId}-${args.date}-${args.startTime}-${args.sessionType}`
  if (seen.has(id)) return
  seen.add(id)
  ghosts.push({
    id,
    date: args.date,
    startTime: args.startTime,
    endTime: args.endTime,
    courseCode: args.courseCode,
    courseTitle: args.courseTitle,
    sectionId: args.sectionId,
    instructor: '',
    venue: args.venue,
    sessionType: args.sessionType,
    module: args.module,
    planRevision: 'previous',
    planChangeId: args.planChangeId,
  })
}

/** Mark which live events sit on an unread Teaching Plan “updated” date for this user. */
export function annotateUpdatedEvents(
  events: CalendarEvent[],
  selections: SelectedSection[],
  unreadNoticeIds?: Set<string>,
): { events: CalendarEvent[], meta: PlanImpactMeta } {
  const changes = buildPlanChanges(selections, unreadNoticeIds)
  const updatedDates = new Set<string>()
  const previousDates = new Set<string>()

  if (selections.length === 0) {
    return {
      events,
      meta: {
        changes: [],
        updatedDates,
        focusDate: null,
        previousEventCount: 0,
        updatedEventCount: 0,
      },
    }
  }

  // Match live events by session kind so a TUT move does not outline a lecture
  // that happens to share the same calendar day.
  const byCourseSectionTypeDate = new Map<string, string>()
  const byCourseTypeDate = new Map<string, string>()

  for (const change of changes) {
    for (const date of change.updatedDates) {
      updatedDates.add(date)
      const typeKey = `${change.courseCode}|${change.sessionType}|${date}`
      const scopedIds = change.sessionType === 'tutorial'
        ? (change.tutorialFor?.length ? change.tutorialFor : null)
        : (change.sectionId && change.sectionId !== 'TUT' ? [change.sectionId] : null)
      if (scopedIds) {
        for (const sectionId of scopedIds) {
          byCourseSectionTypeDate.set(
            `${change.courseCode}|${sectionId}|${change.sessionType}|${date}`,
            change.id,
          )
        }
      } else if (!byCourseTypeDate.has(typeKey)) {
        byCourseTypeDate.set(typeKey, change.id)
      }
    }
    for (const date of change.previousDates) previousDates.add(date)
  }

  let updatedEventCount = 0
  const annotated = events.map(ev => {
    if (ev.planRevision === 'previous') return ev
    const sectionKey = `${ev.courseCode}|${ev.sectionId}|${ev.sessionType}|${ev.date}`
    const typeKey = `${ev.courseCode}|${ev.sessionType}|${ev.date}`
    const planChangeId =
      byCourseSectionTypeDate.get(sectionKey) ?? byCourseTypeDate.get(typeKey)
    if (planChangeId) {
      updatedEventCount += 1
      return { ...ev, planRevision: 'updated' as const, planChangeId }
    }
    return ev
  })

  const focusDate =
    changes[0]?.sortDate
    ?? [...updatedDates].sort()[0]
    ?? [...previousDates].sort()[0]
    ?? null

  return {
    events: annotated,
    meta: {
      changes,
      updatedDates,
      focusDate,
      previousEventCount: 0,
      updatedEventCount,
    },
  }
}

/** @deprecated kept for any leftover imports */
export function buildPlanImpactIndex(selections: SelectedSection[]) {
  const previous = buildPlanPreviousEvents(selections, [])
  const { meta } = annotateUpdatedEvents([], selections)
  return {
    oldDates: new Set(previous.map(e => e.date)),
    newDates: meta.updatedDates,
    byCourseDate: new Map(),
    hits: [],
    focusDate: meta.focusDate,
    personalHitCount: previous.length + meta.updatedEventCount,
  }
}

export function eventHasPlanImpact(): boolean {
  return false
}

export function dayPlanImpactKind(): null {
  return null
}

// silence unused ChangePart import path if tree-shaken — keep type used
export type { ChangePart }
