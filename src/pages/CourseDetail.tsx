import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCourses } from '../hooks/useCoursesData'
import WeekdayStrip from '../components/WeekdayStrip'
import MeconRoleBadges from '../components/MeconRoleBadges'
import StreamTagBadges from '../components/StreamTagBadges'
import CourseOutlineViewer from '../components/CourseOutlineViewer'
import TimeBadge from '../components/TimeBadge'
import { useI18n } from '../i18n/context'
import { useSelectedStream } from '../hooks/useSelectedStream'
import { getActiveProgramme } from '../programmes'
import {
  courseInstructors,
  formatSectionInstructors,
  meetingInstructorNames,
  sectionHasInstructor,
} from '../utils/instructors'
import { examSessionRowLabel, resolveExam } from '../utils/exams'
import { formatModuleLabel } from '../utils/moduleLabel'
import { getMeconCourseView } from '../utils/meconCourseView'
import type { Course, ExamOrFinal, Meeting, Section } from '../types'
import { formatSectionScope, formatTutClassLabel } from '../utils/tutorialScope'

const BASE = import.meta.env.BASE_URL

function examBadgeClass(exam: ExamOrFinal): string {
  return exam.kind === 'presentation' || exam.kind === 'other' ? 'badge-presentation' : 'badge-exam'
}

function tutorialScopeForSection(section: Section, meetings: Meeting[]): string[] {
  const fromMeetings = meetings.flatMap(m => m.tutorialFor ?? [])
  if (fromMeetings.length > 0) return [...new Set(fromMeetings)]
  return [section.sectionId]
}

function tutToggleLabel(
  course: Course,
  section: Section,
  tutorialMeetings: Meeting[],
  expanded: boolean,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const allIds = course.sections.map(s => s.sectionId)
  const scopeIds = tutorialScopeForSection(section, tutorialMeetings)
  const shared = scopeIds.length > 1 || (scopeIds.length === 1 && allIds.length > 1 && scopeIds[0] !== section.sectionId)
  const vars = {
    count: tutorialMeetings.length,
    scope: formatSectionScope(scopeIds, allIds),
  }
  if (shared) {
    return expanded
      ? t('courseDetail.tutHideScoped', vars)
      : t('courseDetail.tutShowScoped', vars)
  }
  return expanded
    ? t('courseDetail.tutHide', { count: tutorialMeetings.length })
    : t('courseDetail.tutShow', { count: tutorialMeetings.length })
}

function FinalSessionRow({ exam }: { exam: ExamOrFinal }) {
  const date = exam.date || '-'
  const time = exam.startTime && exam.endTime ? `${exam.startTime}-${exam.endTime}` : '-'
  const venue = exam.venue || '-'
  return (
    <tr style={{ borderBottom: '1px solid #f1f3f4' }}>
      <td style={{ padding: '4px 8px' }}>{date}</td>
      <td style={{ padding: '4px 8px' }}>{time}</td>
      <td style={{ padding: '4px 8px' }}>{venue}</td>
      <td style={{ padding: '4px 8px' }}>
        <span className={`badge ${examBadgeClass(exam)}`}>{examSessionRowLabel(exam.kind)}</span>
      </td>
      <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>-</td>
    </tr>
  )
}

export function CourseDetailContent({
  courseCode,
  compact = false,
}: {
  courseCode: string
  compact?: boolean
}) {
  const { t, sectionLabel } = useI18n()
  const { courses, loading } = useCourses()
  const programme = getActiveProgramme()
  const { stream } = useSelectedStream()

  const matchedCourses = useMemo(
    () => courses.filter(c => c.courseCode === courseCode),
    [courses, courseCode],
  )

  const instructors = useMemo(() => {
    const base = courseInstructors(matchedCourses)
    return base.map(inst => {
      const parts = new Set<string>()
      for (const course of matchedCourses) {
        for (const section of course.sections) {
          if (section.part && sectionHasInstructor(section, inst.name)) {
            parts.add(section.part)
          }
        }
      }
      if (parts.size === 1) {
        const part = [...parts][0]
        return { ...inst, note: inst.note ?? `Part ${part}` }
      }
      return inst
    })
  }, [matchedCourses])

  const meconView = useMemo(() => {
    if (programme.id !== 'mecon' || matchedCourses.length === 0) return null
    return getMeconCourseView(matchedCourses[0], stream)
  }, [programme.id, matchedCourses, stream])

  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null)
  useEffect(() => {
    if (instructors.length === 0) return
    if (!selectedInstructor || !instructors.some(i => i.name === selectedInstructor)) {
      setSelectedInstructor(instructors[0].name)
    }
  }, [instructors, selectedInstructor])

  const activeInstructor = selectedInstructor ?? instructors[0]?.name ?? null
  const [tutExpandedBySectionKey, setTutExpandedBySectionKey] = useState<Record<string, boolean>>({})

  if (loading) return <div style={{ padding: compact ? 16 : 40, textAlign: 'center' }}>{t('common.loading')}</div>
  if (matchedCourses.length === 0) {
    return <div style={{ padding: compact ? 16 : 40, textAlign: 'center' }}>{t('courseDetail.notFound', { code: courseCode })}</div>
  }

  const sectionsOf = (course: Course): Section[] =>
    activeInstructor
      ? course.sections.filter(s => sectionHasInstructor(s, activeInstructor))
      : course.sections

  const moduleOrder = programme.moduleNumbers
  const coursesForInstructor = matchedCourses
    .filter(c => sectionsOf(c).length > 0)
    .slice()
    .sort((a, b) => {
      const ia = moduleOrder.indexOf(a.module)
      const ib = moduleOrder.indexOf(b.module)
      const ra = ia === -1 ? Number.POSITIVE_INFINITY : ia
      const rb = ib === -1 ? Number.POSITIVE_INFINITY : ib
      return ra - rb || a.module - b.module
    })

  const pdfPath =
    coursesForInstructor
      .flatMap(sectionsOf)
      .map(s => s.outlinePdfPath)
      .find(Boolean) ??
    coursesForInstructor[0]?.outlinePdfPath ??
    matchedCourses[0].outlinePdfPath

  return (
    <div>
      <div className="detail-header">
        <h1>{matchedCourses[0].courseCode} {matchedCourses[0].courseTitle}</h1>
        <div className="detail-meta">
          {meconView ? (
            <MeconRoleBadges badges={meconView.badges} />
          ) : (
            <>
              <span
                className={`badge ${
                  matchedCourses[0].courseType === 'Core'
                    ? 'badge-core'
                    : matchedCourses[0].courseType === 'Stream Core'
                      ? 'badge-mecon badge-mecon--stream-core'
                      : matchedCourses[0].courseType === 'Capstone'
                        ? 'badge-capstone'
                        : 'badge-elective'
                }`}
              >
                {matchedCourses[0].courseType === 'Stream Core' ? 'STM CORE' : matchedCourses[0].courseType}
              </span>
              <StreamTagBadges tags={matchedCourses[0].streamTags} />
            </>
          )}
        </div>
      </div>

      {instructors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('courseDetail.instructor')}</div>
          <div className="tabs">
            {instructors.map(inst => (
              <button
                key={`${inst.note ?? ''}-${inst.name}`}
                type="button"
                className={`tab ${inst.name === activeInstructor ? 'active' : ''}`}
                onClick={() => setSelectedInstructor(inst.name)}
              >
                {inst.note?.startsWith('Part ')
                  ? t('courseDetail.partTab', {
                      part: inst.note.replace(/^Part\s+/i, ''),
                      name: inst.name,
                    })
                  : (
                      <>
                        {inst.name}
                        {inst.note && (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>
                            ({inst.note})
                          </span>
                        )}
                      </>
                    )}
              </button>
            ))}
          </div>
        </div>
      )}

      {coursesForInstructor.map(course => {
        const secs = sectionsOf(course)
        return (
          <div key={course.module} style={{ marginBottom: 24 }}>
            <div className="module-header" style={{ fontSize: 14 }}>{formatModuleLabel(course.module, t)}</div>

            {secs.map(sec => {
              const exam = resolveExam(course, sec)
              const tutorialMeetings = sec.meetings.filter(m => m.sessionType === 'tutorial')
              const tutKey = `${course.module}-${sec.sectionId}`
              const tutExpanded = !!tutExpandedBySectionKey[tutKey]
              return (
              <div className="card" key={sec.sectionId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className="section-id" style={{ fontSize: 16 }}>{sectionLabel(sec.sectionId)}</span>
                  <TimeBadge bucket={sec.timeBucket} />
                  <WeekdayStrip days={sec.meetingDays} title={sec.dayPattern} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{formatSectionInstructors(sec)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sec.dayPattern}</span>
                </div>
                <div className="session-table-wrap">
                <table className="session-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('courseDetail.date')}</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('courseDetail.time')}</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('courseDetail.venue')}</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('courseDetail.type')}</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('courseDetail.professor')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.meetings
                      .filter(m => m.sessionType === 'lecture')
                      .map((m, i) => {
                        const taught = meetingInstructorNames(sec, m)
                        const byActive = !activeInstructor || taught.includes(activeInstructor)
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f3f4', opacity: byActive ? 1 : 0.5 }}>
                            <td style={{ padding: '4px 8px' }}>{m.date}</td>
                            <td style={{ padding: '4px 8px' }}>{m.startTime}-{m.endTime}</td>
                            <td style={{ padding: '4px 8px' }}>{m.venue}</td>
                            <td style={{ padding: '4px 8px' }}>
                              <span className="badge badge-core">LEC</span>
                            </td>
                            <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>
                              {taught.join(' / ')}
                            </td>
                          </tr>
                        )
                      })}
                    {exam && <FinalSessionRow exam={exam} />}

                    {tutorialMeetings.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={5} style={{ padding: '6px 8px' }}>
                            <button
                              type="button"
                              className="tut-toggle-btn"
                              onClick={() =>
                                setTutExpandedBySectionKey(prev => ({ ...prev, [tutKey]: !prev[tutKey] }))
                              }
                            >
                              {tutToggleLabel(course, sec, tutorialMeetings, tutExpanded, t)}
                            </button>
                          </td>
                        </tr>
                        {tutExpanded &&
                          tutorialMeetings.map((m, i) => (
                            <tr key={`tut-${i}`} style={{ borderBottom: '1px solid #f1f3f4' }}>
                              <td style={{ padding: '4px 8px' }}>{m.date}</td>
                              <td style={{ padding: '4px 8px' }}>{m.startTime}-{m.endTime}</td>
                              <td style={{ padding: '4px 8px' }}>{m.venue}</td>
                              <td style={{ padding: '4px 8px' }}>
                                <span className="badge badge-capstone">
                                  {formatTutClassLabel(
                                    m.tutorialFor && m.tutorialFor.length > 0 ? m.tutorialFor : [sec.sectionId],
                                    course.sections.map(s => s.sectionId),
                                  )}
                                </span>
                              </td>
                              <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>
                                {meetingInstructorNames(sec, m).join(' / ')}
                              </td>
                            </tr>
                          ))}
                      </>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
              )
            })}
          </div>
        )
      })}

      {pdfPath && (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>{t('courseDetail.outline')}</h2>
          <CourseOutlineViewer pdfPath={pdfPath} baseUrl={BASE} compact={compact} />
        </div>
      )}
    </div>
  )
}

export default function CourseDetail() {
  const { courseCode } = useParams<{ courseCode: string }>()
  return <CourseDetailContent courseCode={courseCode || ''} />
}
