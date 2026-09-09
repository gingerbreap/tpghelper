import type { CalendarEvent } from './calendarEvents'
import { applyIcsEventTemplates, type IcsFormatTemplates } from './icsFormat'
import { getActiveProgramme } from '../programmes'

const icsMeta = getActiveProgramme().ics

const CRLF = '\r\n'

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function toIcsLocalDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-')
  const [hh, mm] = time.split(':')
  return `${y}${m}${d}T${hh}${mm}00`
}

function toIcsDate(date: string): string {
  return date.replace(/-/g, '')
}

function nextDay(date: string): string {
  const cur = new Date(`${date}T12:00:00`)
  cur.setDate(cur.getDate() + 1)
  const y = cur.getFullYear()
  const m = String(cur.getMonth() + 1).padStart(2, '0')
  const d = String(cur.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dtStampUtc(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  )
}

function isTimed(ev: CalendarEvent): boolean {
  return Boolean(ev.startTime && ev.endTime)
}

export function buildIcsContent(
  events: CalendarEvent[],
  templates: IcsFormatTemplates,
): string {
  const stamp = dtStampUtc()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${icsMeta.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const ev of events) {
    const { summary, description } = applyIcsEventTemplates(templates, ev)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${ev.id}@${icsMeta.uidDomain}`)
    lines.push(`DTSTAMP:${stamp}`)
    if (isTimed(ev)) {
      lines.push(`DTSTART:${toIcsLocalDateTime(ev.date, ev.startTime)}`)
      lines.push(`DTEND:${toIcsLocalDateTime(ev.date, ev.endTime)}`)
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(ev.date)}`)
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextDay(ev.date))}`)
    }
    lines.push(`SUMMARY:${escapeIcs(summary)}`)
    if (ev.venue) lines.push(`LOCATION:${escapeIcs(ev.venue)}`)
    if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join(CRLF) + CRLF
}

export function downloadIcs(content: string, filename = icsMeta.filename): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
