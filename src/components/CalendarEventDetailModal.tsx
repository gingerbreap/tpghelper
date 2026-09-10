import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/context'
import type { CalendarEvent } from '../utils/calendarEvents'
import {
  applyIcsEventTemplates,
  formatIcsPreviewWhen,
  type IcsFormatTemplates,
} from '../utils/icsFormat'

interface CalendarEventDetailModalProps {
  event: CalendarEvent
  templates: IcsFormatTemplates
  onClose: () => void
  onViewCourse?: (courseCode: string) => void
}

/** Single-session popup — time, venue, formatted title/description (not full course sheet). */
export default function CalendarEventDetailModal({
  event,
  templates,
  onClose,
  onViewCourse,
}: CalendarEventDetailModalProps) {
  const { t, tList, sectionLabel } = useI18n()
  const weekdays = tList('ics.weekdays')
  const { summary, description } = applyIcsEventTemplates(templates, event)
  const when = formatIcsPreviewWhen(event.date, event.startTime, event.endTime, weekdays)
  const isPrevious = event.planRevision === 'previous'
  const isUpdated = event.planRevision === 'updated'
  const isFinal =
    event.sessionType === 'exam'
    || event.sessionType === 'presentation'
    || event.sessionType === 'other'

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-window calendar-event-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-detail-title"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>

        <div className="modal-body calendar-event-detail-body">
          {(isPrevious || isUpdated) && (
            <div className="calendar-event-detail-badges">
              {isPrevious && (
                <span className="calendar-event-plan-badge">{t('calendar.planPreviousBadge')}</span>
              )}
              {isUpdated && (
                <span className="calendar-event-plan-badge calendar-event-plan-badge--updated">
                  {t('calendar.planUpdatedBadge')}
                </span>
              )}
            </div>
          )}

          <h2 id="calendar-event-detail-title" className="calendar-event-detail-title">
            {summary}
          </h2>

          <div className="calendar-event-detail-when">{when}</div>

          {!isFinal && event.sectionId && (
            <div className="calendar-event-detail-row">
              <span className="calendar-event-detail-label">{t('calendar.eventSection')}</span>
              <span>{sectionLabel(event.sectionId)}</span>
            </div>
          )}

          {!isFinal && event.sessionNumber != null && (
            <div className="calendar-event-detail-row">
              <span className="calendar-event-detail-label">{t('calendar.eventSession')}</span>
              <span>{event.sessionNumber}</span>
            </div>
          )}

          {event.instructor && (
            <div className="calendar-event-detail-row">
              <span className="calendar-event-detail-label">{t('calendar.eventInstructor')}</span>
              <span>{event.instructor}</span>
            </div>
          )}

          {event.venue && (
            <div className="calendar-event-detail-row">
              <span className="calendar-event-detail-label">{t('calendar.eventVenue')}</span>
              <span>{event.venue}</span>
            </div>
          )}

          {description && (
            <div className="calendar-event-detail-desc-block">
              <div className="calendar-event-detail-label">{t('calendar.eventDescription')}</div>
              <pre className="calendar-event-detail-desc">{description}</pre>
            </div>
          )}

          {isPrevious && (
            <p className="calendar-event-detail-note">{t('calendar.planPreviousTitle')}</p>
          )}
          {isUpdated && !isPrevious && (
            <p className="calendar-event-detail-note">{t('calendar.planUpdatedTitle')}</p>
          )}

          {onViewCourse && !isPrevious && (
            <div className="calendar-event-detail-actions">
              <button
                type="button"
                className="select-btn"
                onClick={() => onViewCourse(event.courseCode)}
              >
                {t('calendar.viewCourse')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
