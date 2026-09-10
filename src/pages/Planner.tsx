import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import ConflictNotices from '../components/ConflictNotices'
import CourseDetailModal from '../components/CourseDetailModal'
import PlannerCalendar from '../components/PlannerCalendar'
import StreamTagBadges from '../components/StreamTagBadges'
import TeachingPlanUpdateNotice from '../components/TeachingPlanUpdateNotice'
import TimeBadge from '../components/TimeBadge'
import WeekdayStrip from '../components/WeekdayStrip'
import { useI18n } from '../i18n/context'
import { useCourses, useRequirements } from '../hooks/useCoursesData'
import { groupBackupByType, useBackupSelections } from '../hooks/useBackupSelections'
import {
  countEffectiveSelections,
  getModuleConflict,
  getSameCourseBlockReason,
  isSelectionWaiting,
  sortSelectionsForDisplay,
  useSelections,
} from '../hooks/useSelections'
import { useWishlist } from '../hooks/useWishlist'
import { getActiveProgramme } from '../programmes'
import { buildCalendarEvents } from '../utils/calendarEvents'
import { detectConflicts } from '../utils/conflicts'
import { formatSectionInstructors } from '../utils/instructors'
import type { Course, SelectedSection } from '../types'

function itemKey(s: SelectedSection): string {
  return `${s.courseCode}-M${s.module}-${s.sectionId}`
}

function catalogNumber(courseCode: string): number {
  const match = courseCode.match(/(\d+)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

function compareSelectionsMsba(a: SelectedSection, b: SelectedSection): number {
  if (a.module !== b.module) return b.module - a.module
  const numA = catalogNumber(a.courseCode)
  const numB = catalogNumber(b.courseCode)
  if (numA !== numB) return numA - numB
  return a.courseCode.localeCompare(b.courseCode)
}

export default function Planner() {
  const { t, sectionLabel, locale } = useI18n()
  const programme = getActiveProgramme()
  const modules = programme.moduleNumbers
  const useBackup = programme.features.backupSelections
  const useWishlistFeature = programme.features.wishlist

  const { courses, loading } = useCourses()
  const requirements = useRequirements()
  const enrollmentRules = programme.features.enrollmentRules
    ? (requirements?.enrollmentRules ?? [])
    : []
  const { selections, toggle, isSelected, getForCourseCode, clear, replace, toggleEnrollmentStatus } =
    useSelections(enrollmentRules)
  const {
    wishlist,
    toggle: toggleWishlist,
    remove: removeWishlist,
    reorder,
    isInWishlist,
    clear: clearWishlist,
  } = useWishlist()
  const {
    backup,
    toggle: toggleBackup,
    remove: removeBackup,
    isBackup,
    reorder: reorderBackup,
  } = useBackupSelections()

  const [tab, setTab] = useState<'selected' | 'browse'>('selected')
  const [duplicateMsg, setDuplicateMsg] = useState<string | null>(null)
  const [detailCode, setDetailCode] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const dragRef = useRef<{ type: string; index: number } | null>(null)
  const [dragSource, setDragSource] = useState<{ type: string; index: number } | null>(null)
  const [backupDragOver, setBackupDragOver] = useState<{ type: string; index: number } | null>(null)

  useEffect(() => {
    if (!duplicateMsg) return
    const timer = window.setTimeout(() => setDuplicateMsg(null), 4000)
    return () => window.clearTimeout(timer)
  }, [duplicateMsg])

  const handleToggle = useCallback((s: SelectedSection) => {
    const result = toggle(s)
    if (result === 'duplicate') {
      if (programme.features.enrollmentRules) {
        setDuplicateMsg(
          t('planner.duplicateBrowse', {
            code: s.courseCode,
            section: selections.find(x => x.courseCode === s.courseCode)?.sectionId ?? s.sectionId,
            module: selections.find(x => x.courseCode === s.courseCode)?.module ?? s.module,
          }),
        )
      } else {
        const existing = getForCourseCode(s.courseCode)
        if (existing) {
          setDuplicateMsg(
            t('planner.duplicateBrowse', {
              code: s.courseCode,
              section: existing.sectionId,
              module: existing.module,
            }),
          )
        }
      }
    }
    return result
  }, [toggle, getForCourseCode, t, programme.features.enrollmentRules, selections])

  const promoteFromWishlist = useCallback((s: SelectedSection) => {
    if (isSelected(s.courseCode, s.module, s.sectionId)) {
      removeWishlist(s)
      return
    }
    const existing = getForCourseCode(s.courseCode)
    if (existing) {
      setDuplicateMsg(
        t('planner.duplicateWishlist', {
          code: s.courseCode,
          section: existing.sectionId,
          module: existing.module,
        }),
      )
      return
    }
    toggle(s)
    removeWishlist(s)
  }, [isSelected, getForCourseCode, toggle, removeWishlist, t])

  const promoteFromBackup = useCallback((s: SelectedSection) => {
    if (isSelected(s.courseCode, s.module, s.sectionId)) {
      removeBackup(s)
      return
    }

    const sameCourseBlock = getSameCourseBlockReason(
      s.courseCode,
      s.module,
      s.sectionId,
      selections,
      enrollmentRules,
    )
    const moduleConflict = getModuleConflict(
      s.courseCode,
      s.module,
      selections,
      enrollmentRules,
      locale,
    )

    if (sameCourseBlock) {
      setDuplicateMsg(
        t('planner.duplicateWishlist', {
          code: s.courseCode,
          section: sameCourseBlock.sectionId,
          module: sameCourseBlock.module,
        }),
      )
      return
    }
    if (moduleConflict) {
      setDuplicateMsg(
        t('planner.moduleConflict', {
          code: s.courseCode,
          detail: moduleConflict.message,
        }),
      )
      return
    }

    const result = toggle(s)
    if (result === 'added') {
      removeBackup(s)
    } else if (result === 'duplicate') {
      setDuplicateMsg(
        t('planner.duplicateWishlist', {
          code: s.courseCode,
          section: s.sectionId,
          module: s.module,
        }),
      )
    }
  }, [isSelected, removeBackup, selections, enrollmentRules, toggle, t, locale])

  const conflicts = useMemo(() => detectConflicts(selections, courses), [selections, courses])
  const calendarEvents = useMemo(() => buildCalendarEvents(selections, courses), [selections, courses])

  const sortedSelections = useMemo(
    () => (useBackup ? sortSelectionsForDisplay(selections) : [...selections].sort(compareSelectionsMsba)),
    [selections, useBackup],
  )

  const selectionsByType = useMemo(() => {
    const order = ['Core', 'Elective', 'Capstone'] as const
    return order
      .map(type => ({
        type,
        items: sortedSelections.filter(s => s.courseType === type),
      }))
      .filter(group => group.items.length > 0)
  }, [sortedSelections])

  const backupByType = useMemo(() => groupBackupByType(backup), [backup])

  const effectiveCount = useMemo(
    () => countEffectiveSelections(selections, enrollmentRules),
    [selections, enrollmentRules],
  )

  const stats = useMemo(() => {
    if (useBackup) {
      const countType = (type: string) =>
        countEffectiveSelections(
          selections.filter(s => s.courseType === type),
          enrollmentRules,
        )
      return {
        core: countType('Core'),
        elective: countType('Elective'),
        capstone: countType('Capstone'),
        total: effectiveCount,
      }
    }
    const core = selections.filter(s => s.courseType === 'Core').length
    const elective = selections.filter(s => s.courseType === 'Elective').length
    const capstone = selections.filter(s => s.courseType === 'Capstone').length
    return { core, elective, capstone, total: selections.length }
  }, [selections, enrollmentRules, effectiveCount, useBackup])

  const streamCompletion = useMemo(() => {
    if (!requirements?.streams.AI || !requirements?.streams.MC) return null
    const codes = new Set(selections.map(s => s.courseCode))
    const ai = requirements.streams.AI
    const mc = requirements.streams.MC
    const listA = (ai.listA as { courses: string[] }).courses.filter(c => codes.has(c)).length
    const listB = (ai.listB as { courses: string[] }).courses.filter(c => codes.has(c)).length
    const listC = (mc.listC as { courses: string[] }).courses.filter(c => codes.has(c)).length
    const listD = (mc.listD as { courses: string[] }).courses.filter(c => codes.has(c)).length
    return { listA, listB, listC, listD }
  }, [selections, requirements])

  const esgCompletion = useMemo(() => {
    if (!requirements?.streams.ESG) return null
    const esg = requirements.streams.ESG
    const esgCourses = esg.courses ?? []
    const minRequired = esg.minRequired ?? 3
    const codes = new Set(selections.map(s => s.courseCode))
    const count = esgCourses.filter(c => codes.has(c)).length
    return { count, minRequired }
  }, [selections, requirements])

  const grouped = useMemo(() => {
    const map: Record<number, Course[]> = {}
    for (const c of courses) (map[c.module] ||= []).push(c)
    return map
  }, [courses])

  const findCourse = (courseCode: string, module: number) =>
    courses.find(c => c.courseCode === courseCode && c.module === module)

  const findSection = (courseCode: string, module: number, sectionId: string) =>
    findCourse(courseCode, module)?.sections.find(s => s.sectionId === sectionId)

  const tabSelectedCount = useBackup && effectiveCount !== selections.length
    ? `${effectiveCount} · ${selections.length}`
    : useBackup
      ? effectiveCount
      : selections.length

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>

  const renderSelectionRow = (s: SelectedSection) => {
    const sec = findSection(s.courseCode, s.module, s.sectionId)
    const course = findCourse(s.courseCode, s.module)
    const instructorLabel = sec ? formatSectionInstructors(sec) : s.instructor
    const waiting = isSelectionWaiting(s)
    return (
      <div className="selection-item" key={itemKey(s)}>
        <div
          className="selection-item-main"
          role="button"
          tabIndex={0}
          onClick={() => setDetailCode(s.courseCode)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailCode(s.courseCode) } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontWeight: 600, fontSize: 14 }}>
            <span>{s.courseCode} {sectionLabel(s.sectionId)}</span>
            {sec && <TimeBadge bucket={sec.timeBucket} />}
            {sec && <WeekdayStrip days={sec.meetingDays} title={sec.dayPattern} />}
            {!useBackup && (
              <span className={`badge ${s.courseType === 'Core' ? 'badge-core' : s.courseType === 'Capstone' ? 'badge-capstone' : 'badge-elective'}`}>
                {s.courseType}
              </span>
            )}
            {course && <StreamTagBadges tags={course.streamTags} />}
          </div>
          <div style={{ fontSize: 13, color: '#5f6368' }}>
            {s.courseTitle} · {t('common.instructor', { name: instructorLabel })} · {t('common.module', { module: s.module })}
          </div>
        </div>
        <div className="selection-item-actions">
          <button
            type="button"
            className={[
              'enrollment-status-btn',
              waiting ? 'enrollment-status-btn--waitlist' : 'enrollment-status-btn--registered',
            ].join(' ')}
            onClick={() => toggleEnrollmentStatus(s.courseCode, s.module, s.sectionId)}
            title={waiting ? t('planner.enrollmentWaitlistTitle') : t('planner.enrollmentRegisteredTitle')}
          >
            {waiting ? t('planner.enrollmentWaitlist') : t('planner.enrollmentRegistered')}
          </button>
          <button className="remove-btn" onClick={() => handleToggle(s)}>{t('common.remove')}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TeachingPlanUpdateNotice selections={selections} />

      <h1 className="page-title">{t('planner.title')}</h1>

      <div className="planner-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">{t('planner.totalSelected')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.core}</div>
          <div className="stat-label">Core</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.elective}</div>
          <div className="stat-label">Elective</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.capstone}</div>
          <div className="stat-label">Capstone</div>
        </div>
      </div>

      {esgCompletion && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t('planner.streamProgress')}</div>
          <div style={{ fontSize: 13 }}>
            <strong>{t('planner.streamEsg')}</strong>
            <span className={esgCompletion.count >= esgCompletion.minRequired ? 'check-icon' : 'cross-icon'}>
              {esgCompletion.count >= esgCompletion.minRequired ? '✓' : '✗'}
            </span>{' '}
            {esgCompletion.count}/{esgCompletion.minRequired}
          </div>
        </div>
      )}

      {!esgCompletion && streamCompletion && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t('planner.streamProgress')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
            <div>
              <strong>{t('planner.streamAi')}</strong>
              <span className={streamCompletion.listA >= 1 ? 'check-icon' : 'cross-icon'}>
                {streamCompletion.listA >= 1 ? '✓' : '✗'}
              </span> List A ({streamCompletion.listA}/1)
              {' '}
              <span className={streamCompletion.listB >= 1 ? 'check-icon' : 'cross-icon'}>
                {streamCompletion.listB >= 1 ? '✓' : '✗'}
              </span> List B ({streamCompletion.listB}/1)
            </div>
            <div>
              <strong>{t('planner.streamMc')}</strong>
              <span className={streamCompletion.listC >= 1 ? 'check-icon' : 'cross-icon'}>
                {streamCompletion.listC >= 1 ? '✓' : '✗'}
              </span> List C ({streamCompletion.listC}/1)
              {' '}
              <span className={streamCompletion.listD >= 1 ? 'check-icon' : 'cross-icon'}>
                {streamCompletion.listD >= 1 ? '✓' : '✗'}
              </span> List D ({streamCompletion.listD}/1)
            </div>
          </div>
        </div>
      )}

      {duplicateMsg && (
        <div className="planner-toast" role="status">{duplicateMsg}</div>
      )}

      <PlannerCalendar
        events={calendarEvents}
        courses={courses}
        selections={selections}
        onImportSelections={replace}
        onCourseClick={setDetailCode}
      />

      <ConflictNotices conflicts={conflicts} />

      <div className="tabs">
        <button className={`tab ${tab === 'selected' ? 'active' : ''}`} onClick={() => setTab('selected')}>
          {t('planner.tabSelected', { count: tabSelectedCount })}
        </button>
        <button className={`tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
          {t('planner.tabBrowse')}
        </button>
      </div>

      {tab === 'selected' && (
        <>
          <div className="card" style={{ padding: 0 }}>
            {selections.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#5f6368' }}>
                {t('planner.emptySelected')}
              </div>
            ) : useBackup ? (
              <>
                {selectionsByType.map(group => (
                  <div className="selection-group" key={group.type}>
                    <div className={`selection-group-header selection-group-header--${group.type.toLowerCase()}`}>
                      <span>{group.type}</span>
                      <span className="selection-group-count">{group.items.length}</span>
                    </div>
                    {group.items.map(renderSelectionRow)}
                  </div>
                ))}
                <div style={{ padding: 12, textAlign: 'right' }}>
                  <button className="remove-btn" onClick={clear}>{t('planner.clearAll')}</button>
                </div>
              </>
            ) : (
              <>
                {sortedSelections.map(renderSelectionRow)}
                <div style={{ padding: 12, textAlign: 'right' }}>
                  <button className="remove-btn" onClick={clear}>{t('planner.clearAll')}</button>
                </div>
              </>
            )}
          </div>

          {useWishlistFeature && (
            <div className="wishlist-section">
              <div className="wishlist-header">
                <span>
                  {t('planner.wishlistTitle', { count: wishlist.length })}
                  <span className="wishlist-hint">{t('planner.wishlistHint')}</span>
                </span>
                {wishlist.length > 0 && (
                  <button className="remove-btn" onClick={clearWishlist}>{t('planner.clearWishlist')}</button>
                )}
              </div>
              <div className="card" style={{ padding: 0 }}>
                {wishlist.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#5f6368' }}>
                    {t('planner.emptyWishlist')}
                  </div>
                ) : (
                  wishlist.map((s, index) => {
                    const sec = findSection(s.courseCode, s.module, s.sectionId)
                    const course = findCourse(s.courseCode, s.module)
                    const instructorLabel = sec ? formatSectionInstructors(sec) : s.instructor
                    return (
                      <div
                        className={`selection-item wishlist-item ${dragFrom === index ? 'dragging' : ''} ${dragOver === index ? 'drag-over' : ''}`}
                        key={itemKey(s)}
                        onDragOver={e => {
                          e.preventDefault()
                          if (dragOver !== index) setDragOver(index)
                        }}
                        onDrop={e => {
                          e.preventDefault()
                          if (dragFrom !== null && dragFrom !== index) reorder(dragFrom, index)
                          setDragFrom(null)
                          setDragOver(null)
                        }}
                        onDragEnd={() => {
                          setDragFrom(null)
                          setDragOver(null)
                        }}
                      >
                        <div className="wishlist-actions">
                          <span
                            className="drag-handle"
                            title={t('planner.dragSort')}
                            draggable
                            onDragStart={e => {
                              setDragFrom(index)
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', String(index))
                            }}
                            onClick={e => e.stopPropagation()}
                          >
                            ⋮⋮
                          </span>
                          <button
                            className="select-btn"
                            onClick={() => promoteFromWishlist(s)}
                          >
                            {t('planner.select')}
                          </button>
                        </div>
                        <div
                          className="selection-item-main"
                          role="button"
                          tabIndex={0}
                          onClick={() => setDetailCode(s.courseCode)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailCode(s.courseCode) } }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontWeight: 600, fontSize: 14 }}>
                            <span>{s.courseCode} {sectionLabel(s.sectionId)}</span>
                            {sec && <TimeBadge bucket={sec.timeBucket} />}
                            {sec && <WeekdayStrip days={sec.meetingDays} title={sec.dayPattern} />}
                            <span className={`badge ${s.courseType === 'Core' ? 'badge-core' : s.courseType === 'Capstone' ? 'badge-capstone' : 'badge-elective'}`}>
                              {s.courseType}
                            </span>
                            {course && <StreamTagBadges tags={course.streamTags} />}
                          </div>
                          <div style={{ fontSize: 13, color: '#5f6368' }}>
                            {s.courseTitle} · {t('common.instructor', { name: instructorLabel })} · {t('common.module', { module: s.module })}
                          </div>
                        </div>
                        <button className="remove-btn" onClick={() => removeWishlist(s)}>{t('common.remove')}</button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {useBackup && (
            <div className="backup-section">
              <div className="wishlist-header">
                <span>
                  {t('planner.wishlistTitle', { count: backup.length })}
                  <span className="wishlist-hint">{t('planner.wishlistHint')}</span>
                </span>
              </div>
              <div className="card" style={{ padding: 0 }}>
                {backup.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#5f6368' }}>
                    {t('planner.emptyWishlist')}
                  </div>
                ) : (
                  backupByType.map(group => (
                    <div className="selection-group" key={`backup-${group.type}`}>
                      <div className={`selection-group-header selection-group-header--${group.type.toLowerCase()}`}>
                        <span>{group.type}</span>
                        <span className="selection-group-count">{group.items.length}</span>
                      </div>
                      {group.items.map((s, index) => {
                        const sec = findSection(s.courseCode, s.module, s.sectionId)
                        const course = findCourse(s.courseCode, s.module)
                        const instructorLabel = sec ? formatSectionInstructors(sec) : s.instructor
                        const isDragging =
                          dragSource?.type === group.type && dragSource?.index === index
                        const isDragOver =
                          backupDragOver?.type === group.type && backupDragOver?.index === index
                        return (
                          <div
                            className={`selection-item${isDragging ? ' dragging' : ''}${isDragOver ? ' drag-over' : ''}`}
                            key={`backup-${itemKey(s)}`}
                            draggable
                            onDragStart={e => {
                              const src = { type: group.type, index }
                              dragRef.current = src
                              setDragSource(src)
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', `${group.type}:${index}`)
                            }}
                            onDragEnd={() => {
                              dragRef.current = null
                              setDragSource(null)
                              setBackupDragOver(null)
                            }}
                            onDragOver={e => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              if (dragRef.current?.type !== group.type) return
                              setBackupDragOver({ type: group.type, index })
                            }}
                            onDragLeave={() => {
                              setBackupDragOver(prev =>
                                prev?.type === group.type && prev.index === index ? null : prev,
                              )
                            }}
                            onDrop={e => {
                              e.preventDefault()
                              const from = dragRef.current
                              setBackupDragOver(null)
                              setDragSource(null)
                              dragRef.current = null
                              if (!from || from.type !== group.type) return
                              reorderBackup(group.type, from.index, index)
                            }}
                          >
                            <span
                              className="drag-handle"
                              title={t('planner.dragSort')}
                              aria-label={t('planner.dragSort')}
                              onClick={e => e.stopPropagation()}
                            >
                              ⠿
                            </span>
                            <div
                              className="selection-item-main"
                              role="button"
                              tabIndex={0}
                              onClick={() => setDetailCode(s.courseCode)}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailCode(s.courseCode) } }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontWeight: 600, fontSize: 14 }}>
                                <span>{s.courseCode} {sectionLabel(s.sectionId)}</span>
                                {sec && <TimeBadge bucket={sec.timeBucket} />}
                                {sec && <WeekdayStrip days={sec.meetingDays} title={sec.dayPattern} />}
                                {course && <StreamTagBadges tags={course.streamTags} />}
                              </div>
                              <div style={{ fontSize: 13, color: '#5f6368' }}>
                                {s.courseTitle} · {t('common.instructor', { name: instructorLabel })} · {t('common.module', { module: s.module })}
                              </div>
                            </div>
                            <div className="selection-item-actions">
                              <button className="promote-btn" onClick={() => promoteFromBackup(s)}>
                                {t('planner.select')}
                              </button>
                              <button className="remove-btn" onClick={() => removeBackup(s)}>
                                {t('common.remove')}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'browse' && (
        <div>
          {modules.map(mod => (
            <div key={mod}>
              <div className="module-header">Module {mod}</div>
              {(grouped[mod] || []).map(course => (
                <div className="card" key={`${course.courseCode}-${course.module}`}>
                  <div
                    className="planner-course-header"
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailCode(course.courseCode)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailCode(course.courseCode) } }}
                    style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}
                  >
                    {course.courseCode} {course.courseTitle}
                    <span className={`badge ${course.courseType === 'Core' ? 'badge-core' : course.courseType === 'Capstone' ? 'badge-capstone' : 'badge-elective'}`} style={{ marginLeft: 8 }}>
                      {course.courseType}
                    </span>
                    <StreamTagBadges tags={course.streamTags} />
                  </div>
                  {course.sections.map(sec => {
                    const sel = isSelected(course.courseCode, course.module, sec.sectionId)
                    const instructorLabel = formatSectionInstructors(sec)
                    const candidate: SelectedSection = {
                      courseCode: course.courseCode,
                      courseTitle: course.courseTitle,
                      module: course.module,
                      courseType: course.courseType,
                      sectionId: sec.sectionId,
                      instructor: instructorLabel,
                    }

                    let blocked = false
                    let blockHint: string | undefined
                    if (programme.features.enrollmentRules) {
                      const sameCourseBlock = getSameCourseBlockReason(
                        course.courseCode,
                        course.module,
                        sec.sectionId,
                        selections,
                        enrollmentRules,
                        sel,
                      )
                      const moduleConflict = getModuleConflict(
                        course.courseCode,
                        course.module,
                        selections,
                        enrollmentRules,
                        locale,
                      )
                      blocked = !!sameCourseBlock || (!!moduleConflict && !sel)
                      blockHint = sameCourseBlock
                        ? t('planner.duplicateHint', {
                            section: sameCourseBlock.sectionId,
                            module: sameCourseBlock.module,
                          })
                        : moduleConflict && !sel
                          ? moduleConflict.message
                          : undefined
                    } else {
                      const existingForCode = getForCourseCode(course.courseCode)
                      blocked = !!existingForCode && !sel
                      blockHint = blocked && existingForCode
                        ? t('planner.duplicateHint', {
                            section: existingForCode.sectionId,
                            module: existingForCode.module,
                          })
                        : undefined
                    }

                    const inAlt = useBackup
                      ? isBackup(course.courseCode, course.module, sec.sectionId)
                      : isInWishlist(course.courseCode, course.module, sec.sectionId)

                    return (
                      <div key={sec.sectionId} className="section-row" style={{ justifyContent: 'space-between' }}>
                        <div
                          className="planner-section-info"
                          role="button"
                          tabIndex={0}
                          onClick={() => setDetailCode(course.courseCode)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailCode(course.courseCode) } }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                        >
                          <span className="section-id">{sectionLabel(sec.sectionId)}</span>
                          <TimeBadge bucket={sec.timeBucket} />
                          <WeekdayStrip days={sec.meetingDays} title={sec.dayPattern} />
                          <span style={{ fontSize: 13 }}>{instructorLabel}</span>
                          {blockHint && (
                            <span className="duplicate-hint">{blockHint}</span>
                          )}
                        </div>
                        <div className={useBackup ? 'section-row-actions' : 'section-actions'}>
                          <button
                            className={`select-btn ${sel ? 'selected' : ''} ${blocked ? 'disabled' : ''}`}
                            disabled={blocked}
                            title={blockHint}
                            onClick={() => handleToggle(candidate)}
                          >
                            {sel ? t('planner.selected') : blocked ? t('planner.blocked') : t('planner.select')}
                          </button>
                          {useBackup ? (
                            <button
                              className={`backup-btn ${inAlt ? 'in-backup' : ''}`}
                              onClick={() => toggleBackup(candidate)}
                            >
                              {inAlt ? t('planner.inWishlist') : t('planner.addWishlist')}
                            </button>
                          ) : (
                            <button
                              className={`alt-btn ${inAlt ? 'in-wishlist' : ''}`}
                              onClick={() => toggleWishlist(candidate)}
                            >
                              {inAlt ? t('planner.inWishlist') : t('planner.addWishlist')}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {detailCode && (
        <CourseDetailModal courseCode={detailCode} onClose={() => setDetailCode(null)} />
      )}
    </div>
  )
}
