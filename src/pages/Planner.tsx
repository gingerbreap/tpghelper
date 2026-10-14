import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import ConflictNotices from '../components/ConflictNotices'
import CourseDetailModal from '../components/CourseDetailModal'
import MeconRoleBadges from '../components/MeconRoleBadges'
import PlannerCalendar from '../components/PlannerCalendar'
import StreamSwitchModal from '../components/StreamSwitchModal'
import StreamTagBadges from '../components/StreamTagBadges'
import TeachingPlanUpdateNotice from '../components/TeachingPlanUpdateNotice'
import TimeBadge from '../components/TimeBadge'
import WeekdayStrip from '../components/WeekdayStrip'
import { useI18n } from '../i18n/context'
import { useCourses, useRequirements } from '../hooks/useCoursesData'
import { useSelectedStream } from '../hooks/useSelectedStream'
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
import { MECON_STREAMS } from '../programmes/mecon/streamTags'
import { buildCalendarEvents } from '../utils/calendarEvents'
import { detectConflicts } from '../utils/conflicts'
import { formatSectionInstructors } from '../utils/instructors'
import {
  checkAntirequisiteForCourse,
  formatAntirequisiteBlockMessage,
} from '../utils/antirequisites'
import {
  defaultSelectionType,
  getMeconCourseView,
  isMeconDualStreamCapstone,
  isMeconStreamCoreForStream,
  meconRetypeOptions,
} from '../utils/meconCourseView'
import { formatModuleLabel, formatModuleLabelCompact } from '../utils/moduleLabel'
import {
  checkPrerequisitesForCourse,
  selectedCourseCodes,
  selectionMissingPrerequisites,
} from '../utils/prerequisites'
import { groupSelectionsByType } from '../utils/selectionGroups'
import { getMeconRequirementTargets } from '../utils/meconRequirements'
import type { Course, SelectedSection } from '../types'

const MECON_STREAM_LABEL_KEY: Record<string, string> = {
  ARS: 'planner.streamArs',
  THY: 'planner.streamThy',
  DA: 'planner.streamDa',
  PL: 'planner.streamPl',
}

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
  const isMecon = programme.id === 'mecon'
  const modules = programme.moduleNumbers
  const useWishlistFeature = programme.features.wishlist
  const groupSelectedByType = programme.features.groupSelectedByType
  const useEnrollmentRules = programme.features.enrollmentRules
  const { stream, setStream, required: requireStream } = useSelectedStream()

  const { courses, loading } = useCourses()
  const requirements = useRequirements()
  const enrollmentRules = useEnrollmentRules
    ? (requirements?.enrollmentRules ?? [])
    : []
  const {
    selections,
    toggle,
    isSelected,
    getForCourseCode,
    clear,
    replace,
    toggleEnrollmentStatus,
    retype: retypeSelection,
  } = useSelections(enrollmentRules)
  const {
    wishlist,
    toggle: toggleWishlist,
    remove: removeWishlist,
    reorder,
    retype,
    isInWishlist,
    clear: clearWishlist,
  } = useWishlist()

  const [tab, setTab] = useState<'selected' | 'browse'>('selected')
  const [duplicateMsg, setDuplicateMsg] = useState<string | null>(null)
  const [detailCode, setDetailCode] = useState<string | null>(null)
  const [streamModal, setStreamModal] = useState<null | 'select' | 'switch'>(null)
  const dragRef = useRef<{ type: string; index: number } | null>(null)
  const [dragSource, setDragSource] = useState<{ type: string; index: number } | null>(null)
  const [wishlistDragOver, setWishlistDragOver] = useState<{ type: string; index: number } | null>(null)
  /** Keys of selections auto-restored from Elective → Stream Core when SC ≤ 3. */
  const [autoResetKeys, setAutoResetKeys] = useState<Set<string>>(() => new Set())
  const needsStream = requireStream && !stream

  useEffect(() => {
    if (!duplicateMsg) return
    const timer = window.setTimeout(() => setDuplicateMsg(null), 4000)
    return () => window.clearTimeout(timer)
  }, [duplicateMsg])

  const planCodes = useMemo(() => selectedCourseCodes(selections), [selections])

  const handleToggle = useCallback((s: SelectedSection) => {
    if (!isSelected(s.courseCode, s.module, s.sectionId) && useEnrollmentRules) {
      const prereq = checkPrerequisitesForCourse(s.courseCode, planCodes, enrollmentRules)
      if (!prereq.ok) {
        setDuplicateMsg(
          t('planner.prerequisiteBlockedHint', { codes: prereq.missing.join(', ') }),
        )
        return 'duplicate' as const
      }
      const antireq = checkAntirequisiteForCourse(s.courseCode, planCodes, enrollmentRules)
      if (!antireq.ok) {
        setDuplicateMsg(
          formatAntirequisiteBlockMessage(s.courseCode, antireq.blocking, locale),
        )
        return 'duplicate' as const
      }
    }
    const result = toggle(s)
    if (result === 'duplicate') {
      if (useEnrollmentRules) {
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
  }, [
    toggle,
    getForCourseCode,
    t,
    useEnrollmentRules,
    useEnrollmentRules,
    selections,
    enrollmentRules,
    planCodes,
    isSelected,
    locale,
  ])

  const promoteFromWishlist = useCallback((s: SelectedSection) => {
    if (isSelected(s.courseCode, s.module, s.sectionId)) {
      removeWishlist(s)
      return
    }

    if (useEnrollmentRules) {
      const prereq = checkPrerequisitesForCourse(s.courseCode, planCodes, enrollmentRules)
      if (!prereq.ok) {
        setDuplicateMsg(
          t('planner.prerequisiteBlockedHint', { codes: prereq.missing.join(', ') }),
        )
        return
      }
      const antireq = checkAntirequisiteForCourse(s.courseCode, planCodes, enrollmentRules)
      if (!antireq.ok) {
        setDuplicateMsg(
          formatAntirequisiteBlockMessage(s.courseCode, antireq.blocking, locale),
        )
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
      if (result === 'added') removeWishlist(s)
      else if (result === 'duplicate') {
        setDuplicateMsg(
          t('planner.duplicateWishlist', {
            code: s.courseCode,
            section: s.sectionId,
            module: s.module,
          }),
        )
      }
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
  }, [
    isSelected,
    getForCourseCode,
    toggle,
    removeWishlist,
    t,
    useEnrollmentRules,
    selections,
    enrollmentRules,
    locale,
    planCodes,
  ])

  const conflicts = useMemo(() => detectConflicts(selections, courses), [selections, courses])
  const calendarEvents = useMemo(() => buildCalendarEvents(selections, courses), [selections, courses])

  const sortedSelections = useMemo(
    () => (groupSelectedByType
      ? sortSelectionsForDisplay(selections)
      : [...selections].sort(compareSelectionsMsba)),
    [selections, groupSelectedByType],
  )

  const selectionsByType = useMemo(
    () => groupSelectionsByType(sortedSelections, programme.selectionTypeOrder),
    [sortedSelections, programme.selectionTypeOrder],
  )

  const wishlistByType = useMemo(
    () => groupSelectionsByType(wishlist, programme.selectionTypeOrder),
    [wishlist, programme.selectionTypeOrder],
  )

  const typeGroupLabel = useCallback((type: string) => {
    if (type === 'Core') return t('planner.groupCore')
    if (type === 'Stream Core') return t('planner.groupStreamCore')
    if (type === 'Capstone') return t('planner.groupCapstone')
    return t('planner.groupElective')
  }, [t])

  const effectiveCount = useMemo(
    () => countEffectiveSelections(selections, enrollmentRules),
    [selections, enrollmentRules],
  )

  /** ECON6067 needs both module 0 (Part I) and module 1 (Part II) to count. */
  const econ6067MissingPart = useMemo((): 'I' | 'II' | null => {
    if (!isMecon) return null
    const parts = selections.filter(s => s.courseCode === 'ECON6067')
    if (parts.length === 0) return null
    const mods = new Set(parts.map(s => s.module))
    const partI = mods.has(0)
    const partII = mods.has(1)
    if (partI && partII) return null
    if (partI && !partII) return 'II'
    if (!partI && partII) return 'I'
    return null
  }, [isMecon, selections])

  const excludeIncomplete6067 = !!econ6067MissingPart

  const stats = useMemo(() => {
    const skipIncomplete6067 = (s: SelectedSection) =>
      !(excludeIncomplete6067 && s.courseCode === 'ECON6067')

    if (useEnrollmentRules) {
      const eligible = selections.filter(skipIncomplete6067)
      const countType = (type: string) =>
        countEffectiveSelections(
          eligible.filter(s => s.courseType === type),
          enrollmentRules,
        )
      return {
        core: countType('Core'),
        streamCore: isMecon ? countType('Stream Core') : 0,
        elective: countType('Elective'),
        capstone: countType('Capstone'),
        total: countEffectiveSelections(eligible, enrollmentRules),
      }
    }
    const eligible = selections.filter(skipIncomplete6067)
    const core = eligible.filter(s => s.courseType === 'Core').length
    const streamCore = isMecon
      ? eligible.filter(s => s.courseType === 'Stream Core').length
      : 0
    const elective = eligible.filter(s => s.courseType === 'Elective').length
    const capstone = eligible.filter(s => s.courseType === 'Capstone').length
    return { core, streamCore, elective, capstone, total: eligible.length }
  }, [selections, enrollmentRules, useEnrollmentRules, isMecon, excludeIncomplete6067])

  const streamCompletion = useMemo(() => {
    if (isMecon || !requirements?.streams.AI || !requirements?.streams.MC) return null
    const codes = new Set(selections.map(s => s.courseCode))
    const ai = requirements.streams.AI
    const mc = requirements.streams.MC
    const listA = (ai.listA as { courses: string[] }).courses.filter(c => codes.has(c)).length
    const listB = (ai.listB as { courses: string[] }).courses.filter(c => codes.has(c)).length
    const listC = (mc.listC as { courses: string[] }).courses.filter(c => codes.has(c)).length
    const listD = (mc.listD as { courses: string[] }).courses.filter(c => codes.has(c)).length
    return { listA, listB, listC, listD }
  }, [selections, requirements, isMecon])

  const esgCompletion = useMemo(() => {
    if (isMecon || !requirements?.streams.ESG) return null
    const esg = requirements.streams.ESG
    const esgCourses = esg.courses ?? []
    const minRequired = esg.minRequired ?? 3
    const codes = new Set(selections.map(s => s.courseCode))
    const count = esgCourses.filter(c => codes.has(c)).length
    return { count, minRequired }
  }, [selections, requirements, isMecon])

  const meconTargets = useMemo(
    () => (isMecon ? getMeconRequirementTargets(requirements, stream) : null),
    [isMecon, requirements, stream],
  )

  const streamCoreRequired = meconTargets?.streamCore ?? 3
  const streamCoreOverflow = isMecon && stats.streamCore > streamCoreRequired
  const streamCoreUnderfill = isMecon && stats.streamCore < streamCoreRequired

  /** Electives that can count as Stream Core for the active stream. */
  const electiveStreamCoreCandidates = useMemo(() => {
    if (!isMecon || !stream) return [] as SelectedSection[]
    return selections.filter(s => {
      if (s.courseType !== 'Elective') return false
      if (excludeIncomplete6067 && s.courseCode === 'ECON6067') return false
      const course = courses.find(c => c.courseCode === s.courseCode && c.module === s.module)
      return !!course && isMeconStreamCoreForStream(course, stream)
    })
  }, [isMecon, stream, selections, courses, excludeIncomplete6067])

  const streamCoreMoveBanner = useMemo(() => {
    if (!streamCoreUnderfill || electiveStreamCoreCandidates.length <= 1) return null
    const need = streamCoreRequired - stats.streamCore
    if (need <= 0) return null
    const codes = [...new Set(electiveStreamCoreCandidates.map(s => s.courseCode))]
    return { codes: codes.join('/'), need }
  }, [
    streamCoreUnderfill,
    electiveStreamCoreCandidates,
    streamCoreRequired,
    stats.streamCore,
  ])

  /** Drop auto-reset notices for removed rows. */
  useEffect(() => {
    const alive = new Set(selections.map(itemKey))
    setAutoResetKeys(prev => {
      let changed = false
      const next = new Set<string>()
      for (const k of prev) {
        if (alive.has(k)) next.add(k)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [selections])

  /**
   * When STM Core < required and Electives has exactly one course that can be
   * Stream Core for this stream, auto-restore it.
   */
  useEffect(() => {
    if (!isMecon || !stream || loading) return
    if (!streamCoreUnderfill) return
    if (electiveStreamCoreCandidates.length !== 1) return

    const only = electiveStreamCoreCandidates[0]
    const key = itemKey(only)
    replace(
      selections.map(s =>
        itemKey(s) === key ? { ...s, courseType: 'Stream Core' } : s,
      ),
    )
    setAutoResetKeys(prev => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }, [
    isMecon,
    stream,
    loading,
    streamCoreUnderfill,
    electiveStreamCoreCandidates,
    selections,
    replace,
  ])

  const meconStreamName = useMemo(() => {
    if (!isMecon || !stream) return null
    const labelKey = MECON_STREAM_LABEL_KEY[stream]
    if (labelKey) return t(labelKey)
    return (
      requirements?.streams[stream]?.name
      ?? MECON_STREAMS.find(s => s.id === stream)?.name
      ?? stream
    )
  }, [isMecon, stream, requirements, t])

  const grouped = useMemo(() => {
    const map: Record<number, Course[]> = {}
    for (const c of courses) (map[c.module] ||= []).push(c)
    return map
  }, [courses])

  const findCourse = (courseCode: string, module: number) =>
    courses.find(c => c.courseCode === courseCode && c.module === module)

  const findSection = (courseCode: string, module: number, sectionId: string) =>
    findCourse(courseCode, module)?.sections.find(s => s.sectionId === sectionId)

  // Mecon: show only effective course count (incomplete ECON6067 parts excluded).
  // Other programmes: when multi-module courses collapse, show "effective · raw".
  const tabSelectedCount = isMecon
    ? stats.total
    : useEnrollmentRules && effectiveCount !== selections.length
      ? `${effectiveCount} · ${selections.length}`
      : useEnrollmentRules
        ? effectiveCount
        : selections.length

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>

  const renderSelectionRow = (s: SelectedSection) => {
    const sec = findSection(s.courseCode, s.module, s.sectionId)
    const course = findCourse(s.courseCode, s.module)
    const meconView = isMecon && course ? getMeconCourseView(course, stream) : null
    const allowScOverflowRetype =
      streamCoreOverflow
      && s.courseType === 'Stream Core'
      && !!course
      && isMeconStreamCoreForStream(course, stream)
    const allowScUnderfillRetype =
      !!streamCoreMoveBanner
      && s.courseType === 'Elective'
      && !!course
      && isMeconStreamCoreForStream(course, stream)
    const retypeOptions = isMecon && course
      ? meconRetypeOptions(
          course,
          stream,
          s.courseType,
          allowScOverflowRetype,
          allowScUnderfillRetype,
        )
      : []
    const showAutoResetNotice =
      autoResetKeys.has(itemKey(s)) && retypeOptions.length === 0
    const instructorLabel = sec ? formatSectionInstructors(sec) : s.instructor
    const waiting = isSelectionWaiting(s)
    const prereqCheck = useEnrollmentRules
      ? selectionMissingPrerequisites(s, selections, enrollmentRules)
      : { ok: true, missing: [] as string[] }
    const missingPrereq = !prereqCheck.ok
    return (
      <div
        className={`selection-item${missingPrereq ? ' selection-item--prereq-missing' : ''}`}
        key={itemKey(s)}
      >
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
            {!groupSelectedByType && (
              <span className={`badge ${s.courseType === 'Core' ? 'badge-core' : s.courseType === 'Capstone' ? 'badge-capstone' : 'badge-elective'}`}>
                {s.courseType}
              </span>
            )}
            {meconView ? (
              <MeconRoleBadges badges={meconView.badges} />
            ) : (
              course && <StreamTagBadges tags={course.streamTags} />
            )}
          </div>
          <div style={{ fontSize: 13, color: '#5f6368' }}>
            {s.courseTitle} · {t('common.instructor', { name: instructorLabel })} · {formatModuleLabelCompact(s.module, t)}
          </div>
        </div>
        <div className="selection-item-actions">
          {showAutoResetNotice ? (
            <span className="category-retype-notice">{t('planner.retypeAutoReset')}</span>
          ) : retypeOptions.length > 0 ? (
            <select
              className="category-retype-select"
              value=""
              aria-label={t('planner.retypeAsOther')}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                const next = e.target.value
                e.target.value = ''
                if (!next) return
                setAutoResetKeys(prev => {
                  if (!prev.has(itemKey(s))) return prev
                  const copy = new Set(prev)
                  copy.delete(itemKey(s))
                  return copy
                })
                retypeSelection(s, next)
              }}
            >
              <option value="" disabled>
                {t('planner.retypeAsOther')}
              </option>
              {retypeOptions.map(role => (
                <option key={role} value={role}>
                  {typeGroupLabel(role)}
                </option>
              ))}
            </select>
          ) : null}
          {missingPrereq ? (
            <span
              className="prereq-missing-label"
              title={t('planner.prerequisiteBlockedHint', { codes: prereqCheck.missing.join(', ') })}
            >
              {t('planner.missingPrerequisite')}
            </span>
          ) : (
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
          )}
          <button className="remove-btn" onClick={() => handleToggle(s)}>{t('common.remove')}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TeachingPlanUpdateNotice selections={selections} />

      <h1 className="page-title">{t('planner.title')}</h1>

      {!needsStream && (
        <div className="planner-stats">
          {(isMecon && meconTargets
            ? ([
                ['total', stats.total, meconTargets.total, t('planner.totalSelected')],
                ['core', stats.core, meconTargets.core, t('planner.groupCore')],
                ['streamCore', stats.streamCore, meconTargets.streamCore, t('planner.groupStreamCore')],
                ['capstone', stats.capstone, meconTargets.capstone, t('planner.groupCapstone')],
                ['elective', stats.elective, meconTargets.elective, t('planner.groupElective')],
              ] as const)
            : ([
                ['total', stats.total, null, t('planner.totalSelected')],
                ['core', stats.core, null, t('planner.groupCore')],
                ['elective', stats.elective, null, t('planner.groupElective')],
                ['capstone', stats.capstone, null, t('planner.groupCapstone')],
              ] as const)
          ).map(([key, current, required, label]) => {
            const met = required != null && current >= required
            return (
              <div className="stat-card" key={key}>
                <div className="stat-number-row">
                  <span className="stat-number">{current}</span>
                  {required != null && (
                    <span className="stat-number-total">/{required}</span>
                  )}
                  {met && (
                    <span className="check-icon stat-check" aria-label="done">✓</span>
                  )}
                </div>
                <div className="stat-label">{label}</div>
              </div>
            )
          })}
        </div>
      )}

      {isMecon && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="stream-progress-card-header">
            <div className="stream-progress-title">{t('planner.currentStream')}</div>
            {stream ? (
              <button
                type="button"
                className="select-btn stream-switch-btn"
                onClick={() => setStreamModal('switch')}
              >
                {t('planner.switchStream')}
              </button>
            ) : (
              <button
                type="button"
                className="select-btn stream-switch-btn"
                onClick={() => setStreamModal('select')}
              >
                {t('planner.streamSwitchTitle')}
              </button>
            )}
          </div>
          {needsStream ? (
            <div className="planner-stream-gate">{t('planner.streamSelectHint')}</div>
          ) : meconStreamName ? (
            <div style={{ fontSize: 14 }}>
              <strong>{stream}</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                {meconStreamName}
              </span>
            </div>
          ) : null}
        </div>
      )}

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

      {!needsStream && (
        <>
      {econ6067MissingPart && (
        <div className="planner-warn-banner" role="status">
          {t('planner.econ6067PartWarn', { part: econ6067MissingPart })}
        </div>
      )}
      {streamCoreMoveBanner && (
        <div className="planner-warn-banner" role="status">
          {t('planner.streamCoreMoveBanner', {
            codes: streamCoreMoveBanner.codes,
            n: streamCoreMoveBanner.need,
          })}
        </div>
      )}

      <PlannerCalendar
        events={calendarEvents}
        courses={courses}
        selections={selections}
        stream={isMecon ? stream : null}
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
            ) : groupSelectedByType ? (
              <>
                {selectionsByType.map(group => (
                  <div className="selection-group" key={group.type}>
                    <div className={`selection-group-header selection-group-header--${group.type.replace(/\s+/g, '-').toLowerCase()}`}>
                      <span>{typeGroupLabel(group.type)}</span>
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
                  wishlistByType.map(group => (
                    <div className="selection-group" key={`wishlist-${group.type}`}>
                      <div className={`selection-group-header selection-group-header--${group.type.replace(/\s+/g, '-').toLowerCase()}`}>
                        <span>{typeGroupLabel(group.type)}</span>
                        <span className="selection-group-count">{group.items.length}</span>
                      </div>
                      {group.items.map((s, index) => {
                        const sec = findSection(s.courseCode, s.module, s.sectionId)
                        const course = findCourse(s.courseCode, s.module)
                        const meconView = isMecon && course ? getMeconCourseView(course, stream) : null
                        const instructorLabel = sec ? formatSectionInstructors(sec) : s.instructor
                        const isDragging =
                          dragSource?.type === group.type && dragSource?.index === index
                        const isDragOver =
                          wishlistDragOver?.type === group.type && wishlistDragOver?.index === index
                        const wishlistAntireq =
                          useEnrollmentRules
                            ? checkAntirequisiteForCourse(s.courseCode, planCodes, enrollmentRules)
                            : { ok: true, blocking: [] as string[] }
                        const wishlistBlocked = useEnrollmentRules && !wishlistAntireq.ok
                        const wishlistBlockHint = wishlistBlocked
                          ? formatAntirequisiteBlockMessage(s.courseCode, wishlistAntireq.blocking, locale)
                          : undefined
                        const canCrossRetype = (fromType: string, toType: string, item: SelectedSection) => {
                          if (!isMecon) return false
                          if (
                            (fromType !== 'Stream Core' && fromType !== 'Capstone')
                            || (toType !== 'Stream Core' && toType !== 'Capstone')
                          ) return false
                          const c = findCourse(item.courseCode, item.module)
                          return !!c && isMeconDualStreamCapstone(c)
                        }
                        return (
                          <div
                            className={`selection-item wishlist-item${isDragging ? ' dragging' : ''}${isDragOver ? ' drag-over' : ''}${wishlistBlocked ? ' selection-item--prereq-missing' : ''}`}
                            key={`wishlist-${itemKey(s)}`}
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
                              setWishlistDragOver(null)
                            }}
                            onDragOver={e => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              const from = dragRef.current
                              if (!from) return
                              if (from.type === group.type) {
                                setWishlistDragOver({ type: group.type, index })
                                return
                              }
                              const fromGroup = wishlistByType.find(g => g.type === from.type)
                              const item = fromGroup?.items[from.index]
                              if (!item || !canCrossRetype(from.type, group.type, item)) return
                              setWishlistDragOver({ type: group.type, index })
                            }}
                            onDragLeave={() => {
                              setWishlistDragOver(prev =>
                                prev?.type === group.type && prev.index === index ? null : prev,
                              )
                            }}
                            onDrop={e => {
                              e.preventDefault()
                              const from = dragRef.current
                              setWishlistDragOver(null)
                              setDragSource(null)
                              dragRef.current = null
                              if (!from) return
                              if (from.type === group.type) {
                                reorder(group.type, from.index, index)
                                return
                              }
                              const fromGroup = wishlistByType.find(g => g.type === from.type)
                              const item = fromGroup?.items[from.index]
                              if (!item || !canCrossRetype(from.type, group.type, item)) return
                              retype(item, group.type)
                            }}
                          >
                            <div className="wishlist-actions">
                              <span
                                className="drag-handle"
                                title={t('planner.dragSort')}
                                onClick={e => e.stopPropagation()}
                              >
                                ⋮⋮
                              </span>
                              <button
                                className={`select-btn${wishlistBlocked ? ' disabled' : ''}`}
                                disabled={wishlistBlocked}
                                title={wishlistBlockHint}
                                onClick={() => promoteFromWishlist(s)}
                              >
                                {wishlistBlocked ? t('planner.blocked') : t('planner.select')}
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
                                {wishlistBlockHint && (
                                  <span className="duplicate-hint">{wishlistBlockHint}</span>
                                )}
                                {sec && <TimeBadge bucket={sec.timeBucket} />}
                                {sec && <WeekdayStrip days={sec.meetingDays} title={sec.dayPattern} />}
                                {meconView ? (
                                  <MeconRoleBadges badges={meconView.badges} />
                                ) : (
                                  course && <StreamTagBadges tags={course.streamTags} />
                                )}
                              </div>
                              <div style={{ fontSize: 13, color: '#5f6368' }}>
                                {s.courseTitle} · {t('common.instructor', { name: instructorLabel })} · {formatModuleLabelCompact(s.module, t)}
                              </div>
                            </div>
                            <button className="remove-btn" onClick={() => removeWishlist(s)}>{t('common.remove')}</button>
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
          {modules.map(mod => {
            const moduleCourses = (grouped[mod] || []).flatMap(course => {
              if (!isMecon) return [{ course, view: null as ReturnType<typeof getMeconCourseView> }]
              const view = getMeconCourseView(course, stream)
              if (!view) return []
              return [{ course, view }]
            })
            if (moduleCourses.length === 0) return null
            return (
            <div key={mod}>
              <div className="module-header">{formatModuleLabel(mod, t)}</div>
              {moduleCourses.map(({ course, view }) => (
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
                    {view ? (
                      <span style={{ marginLeft: 8 }}>
                        <MeconRoleBadges badges={view.badges} />
                      </span>
                    ) : (
                      <>
                        <span className={`badge ${course.courseType === 'Core' ? 'badge-core' : course.courseType === 'Capstone' ? 'badge-capstone' : 'badge-elective'}`} style={{ marginLeft: 8 }}>
                          {course.courseType}
                        </span>
                        <StreamTagBadges tags={course.streamTags} />
                      </>
                    )}
                  </div>
                  {course.sections.map(sec => {
                    const sel = isSelected(course.courseCode, course.module, sec.sectionId)
                    const instructorLabel = formatSectionInstructors(sec)
                    const candidate: SelectedSection = {
                      courseCode: course.courseCode,
                      courseTitle: course.courseTitle,
                      module: course.module,
                      courseType: isMecon
                        ? defaultSelectionType(course, stream)
                        : course.courseType,
                      sectionId: sec.sectionId,
                      instructor: instructorLabel,
                      status: 'registered',
                    }

                    let blocked = false
                    let blockHint: string | undefined
                    if (useEnrollmentRules) {
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

                    if (!sel && useEnrollmentRules) {
                      const prereq = checkPrerequisitesForCourse(
                        course.courseCode,
                        planCodes,
                        enrollmentRules,
                      )
                      if (!prereq.ok) {
                        blocked = true
                        blockHint = t('planner.prerequisiteBlockedHint', {
                          codes: prereq.missing.join(', '),
                        })
                      }
                      if (!blocked) {
                        const antireq = checkAntirequisiteForCourse(
                          course.courseCode,
                          planCodes,
                          enrollmentRules,
                        )
                        if (!antireq.ok) {
                          blocked = true
                          blockHint = formatAntirequisiteBlockMessage(
                            course.courseCode,
                            antireq.blocking,
                            locale,
                          )
                        }
                      }
                    }

                    const inAlt = isInWishlist(course.courseCode, course.module, sec.sectionId)

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
                        <div className="section-row-actions">
                          <button
                            className={`select-btn ${sel ? 'selected' : ''} ${blocked ? 'disabled' : ''}`}
                            disabled={blocked}
                            title={blockHint}
                            onClick={() => handleToggle(candidate)}
                          >
                            {sel ? t('planner.selected') : blocked ? t('planner.blocked') : t('planner.select')}
                          </button>
                          {useWishlistFeature && (
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
            )
          })}
        </div>
      )}
        </>
      )}

      {detailCode && (
        <CourseDetailModal courseCode={detailCode} onClose={() => setDetailCode(null)} />
      )}

      {isMecon && (
        <StreamSwitchModal
          open={streamModal !== null}
          mode={streamModal ?? 'select'}
          currentStream={stream}
          courses={courses}
          selections={selections}
          onClose={() => setStreamModal(null)}
          onConfirm={(nextStream, nextSelections) => {
            setStream(nextStream)
            replace(nextSelections)
            setStreamModal(null)
          }}
        />
      )}
    </div>
  )
}
