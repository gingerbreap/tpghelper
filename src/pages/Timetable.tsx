import { Fragment, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourses } from '../hooks/useCoursesData'
import WeekdayStrip from '../components/WeekdayStrip'
import StreamTagBadges from '../components/StreamTagBadges'
import TimeBadge from '../components/TimeBadge'
import { useI18n } from '../i18n/context'
import { getActiveProgramme } from '../programmes'
import { formatSectionInstructors } from '../utils/instructors'
import { timetableExamLine } from '../utils/exams'
import type { Course, Section } from '../types'

function TypeBadge({ type }: { type: string }) {
  const cls = type === 'Core' ? 'badge-core' : type === 'Capstone' ? 'badge-capstone' : 'badge-elective'
  return <span className={`badge ${cls}`}>{type}</span>
}

function summarizeDates(section: Section, formatSessionCount: (count: number) => string): string {
  const lectures = section.meetings.filter(m => m.sessionType === 'lecture')
  if (lectures.length === 0) return ''
  const days = lectures.map(m => m.date)
  const first = days[0]
  const last = days[days.length - 1]
  const time = `${lectures[0].startTime}-${lectures[0].endTime}`
  return `${first} ~ ${last} | ${time} | ${formatSessionCount(lectures.length)}`
}

function TimetableInstructor({ section }: { section: Section }) {
  const label = formatSectionInstructors(section)
  const parts = label.split(' & ')
  if (parts.length < 2) {
    return <span className="course-instructor">{label}</span>
  }
  return (
    <span className="course-instructor course-instructor--split">
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <>
              <wbr />
              <span className="course-instructor-amp"> & </span>
            </>
          )}
          {part}
        </Fragment>
      ))}
    </span>
  )
}

function CourseCard({ course, sectionLabel, formatSessionCount }: {
  course: Course
  sectionLabel: (id: string) => string
  formatSessionCount: (count: number) => string
}) {
  const navigate = useNavigate()

  return (
    <div className="card card-clickable course-card" onClick={() => navigate(`/course/${course.courseCode}`)}>
      <div className="course-card-header">
        <div>
          <span className="course-code">{course.courseCode}</span>
          <span className="course-title" style={{ marginLeft: 8 }}>{course.courseTitle}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <TypeBadge type={course.courseType} />
          <StreamTagBadges tags={course.streamTags} />
        </div>
      </div>
      {course.sections.map(sec => (
        <div className="section-row" key={sec.sectionId}>
          <span className="section-id">{sectionLabel(sec.sectionId)}</span>
          <TimeBadge bucket={sec.timeBucket} />
          <WeekdayStrip days={sec.meetingDays} title={sec.dayPattern} />
          <TimetableInstructor section={sec} />
          <span className="section-time">{summarizeDates(sec, formatSessionCount)}</span>
        </div>
      ))}
      {course.sections.some(s => s.examOrFinal) ? (
        course.sections.filter(s => s.examOrFinal).map(s => (
          <div key={s.sectionId} style={{ fontSize: 12, color: '#5f6368', paddingTop: 4 }}>
            📝 {sectionLabel(s.sectionId)} {timetableExamLine(s.examOrFinal!)}
          </div>
        ))
      ) : course.examOrFinal ? (
        <div style={{ fontSize: 12, color: '#5f6368', paddingTop: 4 }}>
          📝 {timetableExamLine(course.examOrFinal)}
        </div>
      ) : null}
    </div>
  )
}

export default function Timetable() {
  const { t, sectionLabel } = useI18n()
  const { courses, loading } = useCourses()
  const modules = getActiveProgramme().moduleNumbers

  const grouped = useMemo(() => {
    const map: Record<number, Course[]> = {}
    for (const c of courses) {
      ;(map[c.module] ||= []).push(c)
    }
    return map
  }, [courses])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>

  const formatSessionCount = (count: number) => t('timetable.sessionCount', { count })

  return (
    <div>
      <h1 className="page-title">{t('timetable.title')}</h1>
      {modules.map(mod => (
        <div key={mod}>
          <div className="module-header">{t(`timetable.module${mod}`)}</div>
          {(grouped[mod] || []).map(c => (
            <CourseCard
              key={`${c.courseCode}-${c.module}`}
              course={c}
              sectionLabel={sectionLabel}
              formatSessionCount={formatSessionCount}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
