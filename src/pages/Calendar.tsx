import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CourseDetailModal from '../components/CourseDetailModal'
import PlannerCalendar from '../components/PlannerCalendar'
import { useI18n } from '../i18n/context'
import { useCourses } from '../hooks/useCoursesData'
import { useUnreadTeachingPlanNoticeIds } from '../hooks/useUnreadTeachingPlanNoticeIds'
import { isSelectionWaiting, useSelections } from '../hooks/useSelections'
import { buildCalendarEvents } from '../utils/calendarEvents'

/** Standalone calendar tab — latest schedule only (no waitlist / no TP previous overlay). */
export default function Calendar() {
  const { t } = useI18n()
  const { courses, loading } = useCourses()
  const { selections, replace } = useSelections()
  const unreadIds = useUnreadTeachingPlanNoticeIds()
  const [detailCode, setDetailCode] = useState<string | null>(null)

  /** 「我的日历」hides Waiting courses; Planner keeps them with a W badge. */
  const calendarSelections = useMemo(
    () => selections.filter(s => !isSelectionWaiting(s)),
    [selections],
  )
  const calendarEvents = useMemo(
    () => buildCalendarEvents(calendarSelections, courses),
    [calendarSelections, courses],
  )
  const unreadCount = unreadIds.size

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>
  }

  return (
    <div className="calendar-page">
      {/* Title slot: short unread tip only (not the full Planner Teaching Plan notice). */}
      {unreadCount > 0 && (
        <p className="calendar-unread-tp-notice" role="status">
          <Link to="/planner">{t('calendar.unreadTeachingPlan', { count: unreadCount })}</Link>
        </p>
      )}
      <PlannerCalendar
        variant="page"
        events={calendarEvents}
        courses={courses}
        selections={calendarSelections}
        onImportSelections={replace}
        onCourseClick={setDetailCode}
        eventMeta="venue"
      />
      {detailCode && (
        <CourseDetailModal
          courseCode={detailCode}
          onClose={() => setDetailCode(null)}
        />
      )}
    </div>
  )
}
