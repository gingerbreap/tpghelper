import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import IcsExportModal from './IcsExportModal'
import StudyStatusImportModal from './StudyStatusImportModal'
import { CALENDAR_END, CALENDAR_START, holidayLabelKey, holidayLunarTag } from '../data/holidays'
import { useUnreadTeachingPlanNoticeIds } from '../hooks/useUnreadTeachingPlanNoticeIds'
import { useI18n } from '../i18n/context'
import { calendarEventLabel, eventsByDate, type CalendarEvent } from '../utils/calendarEvents'
import {
  annotateUpdatedEvents,
  buildPlanPreviousEvents,
  type PlanChange,
} from '../utils/teachingPlanImpact'
import type { Course, SelectedSection } from '../types'

const LONG_PRESS_MS = 480

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function monthIndex(year: number, month: number) {
  return year * 12 + month
}

function clampMonth(year: number, month: number) {
  const min = monthIndex(CALENDAR_START.year, CALENDAR_START.month)
  const max = monthIndex(CALENDAR_END.year, CALENDAR_END.month)
  const cur = monthIndex(year, month)
  if (cur < min) return { year: CALENDAR_START.year, month: CALENDAR_START.month }
  if (cur > max) return { year: CALENDAR_END.year, month: CALENDAR_END.month }
  return { year, month }
}

function defaultMonth() {
  const now = new Date()
  return clampMonth(now.getFullYear(), now.getMonth())
}

function monthFromDateKey(dateKey: string): { year: number, month: number } | null {
  const [y, m] = dateKey.split('-').map(Number)
  if (!y || !m) return null
  return clampMonth(y, m - 1)
}

interface DayCell {
  dateKey: string
  day: number
  inMonth: boolean
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

  const cells: DayCell[] = []

  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevDays - i
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    cells.push({ dateKey: toDateKey(prevYear, prevMonth, day), day, inMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ dateKey: toDateKey(year, month, day), day, inMonth: true })
  }

  const trailing = (7 - (cells.length % 7)) % 7
  for (let day = 1; day <= trailing; day++) {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    cells.push({ dateKey: toDateKey(nextYear, nextMonth, day), day, inMonth: false })
  }

  return cells
}

function HolidayTag({
  shortLabel,
  fullLabel,
  showBubble,
  onToggle,
}: {
  shortLabel: string
  fullLabel: string
  showBubble: boolean
  onToggle: () => void
}) {
  const showFull = fullLabel && fullLabel !== shortLabel

  return (
    <span className="calendar-holiday-tag-wrap">
      <button
        type="button"
        className="calendar-holiday-label"
        title={fullLabel || shortLabel}
        onClick={e => {
          e.stopPropagation()
          if (showFull) onToggle()
        }}
      >
        {shortLabel}
      </button>
      {showFull && showBubble && (
        <span className="calendar-holiday-bubble" role="tooltip">
          {fullLabel}
        </span>
      )}
    </span>
  )
}

export type CalendarEventMeta = 'instructor' | 'venue'

function EventChip({
  event,
  focused,
  onCourseClick,
  sectionLabel,
  eventMeta = 'instructor',
}: {
  event: CalendarEvent
  focused: boolean
  onCourseClick?: (courseCode: string) => void
  sectionLabel: (sectionId: string) => string
  eventMeta?: CalendarEventMeta
}) {
  const { t } = useI18n()
  const label = calendarEventLabel(event)
  const timed = event.startTime && event.endTime
  const isFinal = event.sessionType === 'exam' || event.sessionType === 'presentation' || event.sessionType === 'other'
  const isPrevious = event.planRevision === 'previous'
  const isUpdated = event.planRevision === 'updated'
  const metaText = eventMeta === 'venue' ? event.venue : event.instructor
  const title = [
    label,
    event.sectionId && !isFinal ? sectionLabel(event.sectionId) : '',
    eventMeta === 'venue' ? event.venue : event.instructor,
    timed ? `${event.startTime}-${event.endTime}` : event.date,
    eventMeta === 'venue' ? event.instructor : event.venue,
    isPrevious ? t('calendar.planPreviousTitle') : '',
    isUpdated ? t('calendar.planUpdatedTitle') : '',
  ].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      className={[
        'calendar-event',
        `calendar-event--${event.sessionType}`,
        isPrevious && 'calendar-event--plan-previous',
        isUpdated && 'calendar-event--plan-updated',
        focused && 'calendar-event--plan-focused',
      ].filter(Boolean).join(' ')}
      title={title}
      onClick={e => {
        e.stopPropagation()
        if (isPrevious) return
        onCourseClick?.(event.courseCode)
      }}
      disabled={isPrevious}
      aria-label={title}
    >
      {isPrevious && (
        <span className="calendar-event-plan-badge">{t('calendar.planPreviousBadge')}</span>
      )}
      {isUpdated && !isPrevious && (
        <span className="calendar-event-plan-badge calendar-event-plan-badge--updated">
          {t('calendar.planUpdatedBadge')}
        </span>
      )}
      <span className="calendar-event-code">{label}</span>
      {timed && <span className="calendar-event-time">{event.startTime}-{event.endTime}</span>}
      {!isPrevious && metaText && (eventMeta === 'venue' || !isFinal) && (
        <span className={eventMeta === 'venue' ? 'calendar-event-venue' : 'calendar-event-instructor'}>
          {metaText}
        </span>
      )}
    </button>
  )
}

/**
 * Icon nav button: desktop hover tooltip + click navigates;
 * mobile long-press shows tooltip without navigating; tap navigates and shows tooltip.
 */
function PlanNavIconButton({
  iconClass,
  label,
  disabled,
  onNavigate,
}: {
  iconClass: string
  label: string
  disabled?: boolean
  onNavigate: () => void
}) {
  const [tipVisible, setTipVisible] = useState(false)
  const longPressFired = useRef(false)
  const touchHandled = useRef(false)
  const pressTimer = useRef<number | null>(null)
  const tipHideTimer = useRef<number | null>(null)

  const clearPressTimer = () => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const clearTipHide = () => {
    if (tipHideTimer.current != null) {
      window.clearTimeout(tipHideTimer.current)
      tipHideTimer.current = null
    }
  }

  const showTipBriefly = () => {
    clearTipHide()
    setTipVisible(true)
    tipHideTimer.current = window.setTimeout(() => setTipVisible(false), 1600)
  }

  useEffect(() => () => {
    clearPressTimer()
    clearTipHide()
  }, [])

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      longPressFired.current = false
      touchHandled.current = false
      clearPressTimer()
      pressTimer.current = window.setTimeout(() => {
        longPressFired.current = true
        setTipVisible(true)
      }, LONG_PRESS_MS)
    }
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    clearPressTimer()
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      touchHandled.current = true
      if (longPressFired.current) {
        // Long-press: tip only — do not navigate
        tipHideTimer.current = window.setTimeout(() => setTipVisible(false), 1600)
        return
      }
      onNavigate()
      showTipBriefly()
    }
  }

  const handlePointerCancel = () => {
    clearPressTimer()
    longPressFired.current = false
  }

  const handleClick = () => {
    if (disabled) return
    // Touch already handled in pointerup; skip the synthetic click
    if (touchHandled.current) {
      touchHandled.current = false
      return
    }
    onNavigate()
  }

  return (
    <button
      type="button"
      className="calendar-plan-nav-btn"
      disabled={disabled}
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={() => {
        clearPressTimer()
        if (!tipHideTimer.current) setTipVisible(false)
      }}
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setTipVisible(true)
      }}
      onMouseLeave={() => {
        if (window.matchMedia('(hover: hover)').matches) setTipVisible(false)
      }}
      onClick={handleClick}
      onContextMenu={e => e.preventDefault()}
    >
      <i className={iconClass} aria-hidden="true" />
      {tipVisible && (
        <span className="calendar-plan-nav-tooltip" role="tooltip">
          {label}
        </span>
      )}
    </button>
  )
}

interface PlannerCalendarProps {
  events: CalendarEvent[]
  courses: Course[]
  selections: SelectedSection[]
  onImportSelections: (selections: SelectedSection[]) => void
  onCourseClick?: (courseCode: string) => void
  /** Secondary line under time: instructor (Planner embed) or venue (My Calendar). */
  eventMeta?: CalendarEventMeta
}

export default function PlannerCalendar({
  events,
  courses,
  selections,
  onImportSelections,
  onCourseClick,
  eventMeta = 'instructor',
}: PlannerCalendarProps) {
  const { t, tList, sectionLabel } = useI18n()
  const weekdays = tList('calendar.weekdays')
  const [{ year, month }, setView] = useState(defaultMonth)
  const [exportOpen, setExportOpen] = useState(false)
  const [studyStatusOpen, setStudyStatusOpen] = useState(false)
  const [activeHolidayBubble, setActiveHolidayBubble] = useState<string | null>(null)
  /** null = default (no change focused); 0 = earliest; last = latest */
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  /** Glow/scale only after month jump (if any) has painted */
  const [focusHighlightActive, setFocusHighlightActive] = useState(false)
  const [pendingFocusHighlight, setPendingFocusHighlight] = useState(false)
  const focusHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearFocusHighlightTimer = () => {
    if (focusHighlightTimerRef.current !== null) {
      clearTimeout(focusHighlightTimerRef.current)
      focusHighlightTimerRef.current = null
    }
  }

  useEffect(() => () => clearFocusHighlightTimer(), [])

  const unreadNoticeIds = useUnreadTeachingPlanNoticeIds()

  const displayEvents = useMemo(() => {
    const previous = buildPlanPreviousEvents(selections, courses, unreadNoticeIds)
    const { events: annotated, meta } = annotateUpdatedEvents(events, selections, unreadNoticeIds)
    const merged = [...annotated, ...previous].sort((a, b) =>
      a.date.localeCompare(b.date)
      || a.startTime.localeCompare(b.startTime)
      || (a.planRevision === 'previous' ? -1 : 1),
    )
    return {
      events: merged,
      changes: meta.changes,
      previousCount: previous.length,
      updatedCount: meta.updatedEventCount,
    }
  }, [events, selections, courses, unreadNoticeIds])

  // Keep focus index valid when dismiss / selection changes shrink the list
  useEffect(() => {
    if (focusIndex === null) return
    if (displayEvents.changes.length === 0) {
      setFocusIndex(null)
      setFocusHighlightActive(false)
      setPendingFocusHighlight(false)
      return
    }
    if (focusIndex >= displayEvents.changes.length) {
      setFocusIndex(displayEvents.changes.length - 1)
    }
  }, [displayEvents.changes.length, focusIndex])

  // After a month jump for focus nav, wait until the new grid is painted before glow/scale
  useEffect(() => {
    if (!pendingFocusHighlight || focusIndex === null) return
    let cancelled = false
    const enable = () => {
      if (cancelled) return
      setFocusHighlightActive(true)
      setPendingFocusHighlight(false)
    }
    // Double rAF ≈ after layout; short timeout covers slower paint
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        clearFocusHighlightTimer()
        focusHighlightTimerRef.current = setTimeout(enable, 40)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearFocusHighlightTimer()
    }
  }, [year, month, pendingFocusHighlight, focusIndex])

  const byDate = useMemo(() => eventsByDate(displayEvents.events), [displayEvents.events])
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])
  /** All date keys actually rendered in this month grid (incl. spillover days). */
  const visibleDateKeys = useMemo(() => new Set(grid.map(c => c.dateKey)), [grid])

  const holidayFullLabel = (labelKey: string) => t(`holidaysFull.${labelKey}`)

  const atStart = monthIndex(year, month) <= monthIndex(CALENDAR_START.year, CALENDAR_START.month)
  const atEnd = monthIndex(year, month) >= monthIndex(CALENDAR_END.year, CALENDAR_END.month)

  const prevMonth = () => {
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    setView(clampMonth(y, m))
  }

  const nextMonth = () => {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    setView(clampMonth(y, m))
  }

  const jumpMonthToDate = (dateKey: string) => {
    const target = monthFromDateKey(dateKey)
    if (target) setView(target)
  }

  const focusChange = (index: number) => {
    const change = displayEvents.changes[index]
    if (!change) return
    clearFocusHighlightTimer()
    // Drop glow immediately so it never animates on the old month
    setFocusHighlightActive(false)

    const target = monthFromDateKey(change.sortDate)
    const needsMonthJump = !!(
      target
      && (target.year !== year || target.month !== month)
    )

    setFocusIndex(index)
    if (needsMonthJump && target) {
      setPendingFocusHighlight(true)
      setView(target)
    } else {
      setPendingFocusHighlight(false)
      setFocusHighlightActive(true)
    }
  }

  const goEarliest = () => {
    if (displayEvents.changes.length === 0) return
    focusChange(0)
  }

  const goPrevious = () => {
    if (focusIndex === null || focusIndex <= 0) return
    focusChange(focusIndex - 1)
  }

  const goNext = () => {
    if (displayEvents.changes.length === 0) return
    if (focusIndex === null) {
      focusChange(0)
      return
    }
    if (focusIndex < displayEvents.changes.length - 1) focusChange(focusIndex + 1)
  }

  const goLatest = () => {
    if (displayEvents.changes.length === 0) return
    focusChange(displayEvents.changes.length - 1)
  }

  const focusedChange: PlanChange | null =
    focusIndex !== null ? displayEvents.changes[focusIndex] ?? null : null
  const focusedChangeId = focusedChange?.id ?? null
  const highlightChangeId =
    focusHighlightActive && focusedChangeId ? focusedChangeId : null
  /** Only related dates that fall outside the current month grid need a jump hint. */
  const hiddenRelatedDates = useMemo(() => {
    if (!focusedChange) return []
    return focusedChange.relatedDates.filter(d => !visibleDateKeys.has(d))
  }, [focusedChange, visibleDateKeys])

  const monthLabel = t('calendar.monthLabel', { year, month: month + 1 })
  const monthEventCount = events.filter(e => {
    const [y, m] = e.date.split('-').map(Number)
    return y === year && m === month + 1
  }).length

  const handleExport = () => {
    setExportOpen(true)
  }

  const showPlanBanner = displayEvents.previousCount > 0 || displayEvents.updatedCount > 0
  const dismissLabel = t('teachingPlan.dismissRead')
  const canPrev = focusIndex !== null && focusIndex > 0
  const canNext = displayEvents.changes.length > 0 && (
    focusIndex === null || focusIndex < displayEvents.changes.length - 1
  )
  const showRelatedFooter = hiddenRelatedDates.length > 0

  const formatRelatedDay = (dateKey: string) => {
    const [, m, d] = dateKey.split('-').map(Number)
    return t('calendar.planUpdateRelatedDay', { month: m, day: d })
  }

  const clearFocusHighlight = () => {
    clearFocusHighlightTimer()
    setFocusHighlightActive(false)
    setPendingFocusHighlight(false)
  }

  const onCalendarCardClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select, textarea')) return
    setActiveHolidayBubble(null)
    clearFocusHighlight()
  }

  return (
    <div className="card planner-calendar" onClick={onCalendarCardClick}>
      <div className="calendar-header">
        <div className="calendar-header-text">
          <div className="calendar-title">{t('calendar.title')}</div>
          <div className="calendar-subtitle">
            {events.length > 0
              ? t('calendar.subtitleCount', { total: events.length, month: monthEventCount })
              : t('calendar.subtitleEmpty')}
          </div>
        </div>
        <div className="calendar-nav">
          <button
            type="button"
            className="calendar-export-btn"
            onClick={handleExport}
            disabled={events.length === 0}
            title={events.length === 0 ? t('calendar.exportDisabled') : t('calendar.exportTitle')}
          >
            {t('calendar.export')}
          </button>
          <button
            type="button"
            className="calendar-export-btn"
            onClick={() => setStudyStatusOpen(true)}
            title={t('calendar.importTitle')}
          >
            {t('calendar.import')}
          </button>
          <div className="calendar-month-cluster">
            <button type="button" className="calendar-nav-btn" onClick={prevMonth} disabled={atStart} aria-label={t('calendar.prevMonth')}>
              ‹
            </button>
            <span className="calendar-month-label">{monthLabel}</span>
            <button type="button" className="calendar-nav-btn" onClick={nextMonth} disabled={atEnd} aria-label={t('calendar.nextMonth')}>
              ›
            </button>
          </div>
        </div>
      </div>

      {showPlanBanner && (
        <div className="calendar-plan-banner">
          <div className="calendar-plan-banner-text">
            {t('calendar.planUpdateBanner', { dismiss: dismissLabel })}
          </div>
          <div className="calendar-plan-nav" role="group" aria-label={t('calendar.planUpdateNavGroup')}>
            <PlanNavIconButton
              iconClass="fas fa-angle-double-left"
              label={t('calendar.planUpdateNavEarliest')}
              disabled={displayEvents.changes.length === 0}
              onNavigate={goEarliest}
            />
            <PlanNavIconButton
              iconClass="fas fa-angle-left"
              label={t('calendar.planUpdateNavPrev')}
              disabled={!canPrev}
              onNavigate={goPrevious}
            />
            <PlanNavIconButton
              iconClass="fas fa-angle-right"
              label={t('calendar.planUpdateNavNext')}
              disabled={!canNext}
              onNavigate={goNext}
            />
            <PlanNavIconButton
              iconClass="fas fa-angle-double-right"
              label={t('calendar.planUpdateNavLatest')}
              disabled={displayEvents.changes.length === 0}
              onNavigate={goLatest}
            />
          </div>
        </div>
      )}

      <div className="calendar-legend">
        <span className="calendar-legend-item">
          <span className="calendar-legend-swatch calendar-event--lecture" /> {t('calendar.legendLec')}
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-legend-swatch calendar-event--tutorial" /> {t('calendar.legendTut')}
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-legend-swatch calendar-event--exam" /> {t('calendar.legendExam')}
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-legend-swatch calendar-event--presentation" /> {t('calendar.legendPresentation')}
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-legend-swatch calendar-legend-swatch--holiday" /> {t('calendar.legendHoliday')}
        </span>
      </div>
      {showPlanBanner && (
        <div className="calendar-legend calendar-legend--plan">
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch calendar-legend-swatch--plan-previous" /> {t('calendar.legendPlanPrevious')}
          </span>
          <span className="calendar-legend-item">
            <span className="calendar-legend-swatch calendar-legend-swatch--plan-updated" /> {t('calendar.legendPlanUpdated')}
          </span>
        </div>
      )}

      <div className="calendar-weekdays">
        {weekdays.map(d => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {grid.map(cell => {
          const dayEvents = byDate[cell.dateKey] || []
          const holidayKey = holidayLabelKey(cell.dateKey)
          const label = holidayKey ? t(`holidays.${holidayKey}`) : undefined
          const fullLabel = holidayKey ? holidayFullLabel(holidayKey) : undefined
          const lunarTag = holidayLunarTag(cell.dateKey)
          const dayHasFocus = !!(
            highlightChangeId
            && dayEvents.some(ev => ev.planChangeId === highlightChangeId)
          )

          return (
            <div
              key={cell.dateKey}
              className={[
                'calendar-day',
                !cell.inMonth && 'calendar-day--other',
                holidayKey && 'calendar-day--holiday',
                dayEvents.length > 0 && 'calendar-day--has-events',
                dayHasFocus && 'calendar-day--focus-raise',
              ].filter(Boolean).join(' ')}
            >
              <div className="calendar-day-header">
                <span className="calendar-day-number">{cell.day}</span>
                {(label || lunarTag) && (
                  <div className="calendar-day-tags">
                    {label && (
                      <HolidayTag
                        shortLabel={label}
                        fullLabel={fullLabel || label}
                        showBubble={activeHolidayBubble === cell.dateKey}
                        onToggle={() =>
                          setActiveHolidayBubble(prev =>
                            prev === cell.dateKey ? null : cell.dateKey,
                          )
                        }
                      />
                    )}
                    {lunarTag && (
                      <span className="calendar-lunar-tag" title={lunarTag}>{lunarTag}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="calendar-day-events">
                {dayEvents.map(ev => (
                  <EventChip
                    key={ev.id}
                    event={ev}
                    focused={!!highlightChangeId && ev.planChangeId === highlightChangeId}
                    onCourseClick={onCourseClick}
                    sectionLabel={sectionLabel}
                    eventMeta={eventMeta}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showRelatedFooter && (
        <div className="calendar-plan-related-footer">
          <span className="calendar-plan-related-label">
            {t('calendar.planUpdateRelatedDates')}
          </span>
          {hiddenRelatedDates.map((dateKey, i) => (
            <span key={dateKey} className="calendar-plan-related-item">
              {i > 0 && (
                <button
                  type="button"
                  className="calendar-plan-related-arrow"
                  aria-label={t('calendar.planUpdateJumpMonth')}
                  onClick={() => jumpMonthToDate(dateKey)}
                >
                  <i className="fas fa-angle-double-right" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="calendar-plan-related-date"
                onClick={() => jumpMonthToDate(dateKey)}
              >
                {formatRelatedDay(dateKey)}
              </button>
            </span>
          ))}
        </div>
      )}

      {exportOpen && (
        <IcsExportModal events={events} onClose={() => setExportOpen(false)} />
      )}
      {studyStatusOpen && (
        <StudyStatusImportModal
          courses={courses}
          onImport={onImportSelections}
          onClose={() => setStudyStatusOpen(false)}
        />
      )}
    </div>
  )
}
