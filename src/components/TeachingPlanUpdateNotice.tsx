import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildDisplayRows,
  isTutorialPlanRow,
  planClassColumnText,
  planRowClassKey,
  teachingPlanNotices,
  teachingPlanRowAffectsUser,
  type ChangePart,
  type TeachingPlanDisplayRow,
  type TeachingPlanNotice,
} from '../data/teachingPlanUpdates'
import { usePersistentDismiss } from '../hooks/usePersistentDismiss'
import { useUnreadTeachingPlanNoticeIds } from '../hooks/useUnreadTeachingPlanNoticeIds'
import { useI18n } from '../i18n/context'
import type { SelectedSection } from '../types'
import {
  dismissAllTeachingPlanNotices,
  teachingPlanDismissEventName,
  teachingPlanDismissStorageKey,
  teachingPlanDismissVersion,
} from '../utils/teachingPlanDismiss'

function emojiFor(kind: ChangePart['emoji']): string {
  if (kind === 'time') return '⏰ '
  if (kind === 'venue') return '📌 '
  return ''
}

function ChangeCell({
  parts,
  hideTimeEmoji = false,
}: {
  parts: ChangePart[]
  hideTimeEmoji?: boolean
}) {
  return (
    <div className="teaching-plan-change-parts">
      {parts.map((part, index) => (
        <div
          key={`${index}-${part.text}`}
          className={part.emoji === 'venue' ? 'teaching-plan-change-part teaching-plan-change-part--venue' : 'teaching-plan-change-part'}
        >
          {hideTimeEmoji && part.emoji === 'time' ? '' : emojiFor(part.emoji)}{part.text}
        </div>
      ))}
    </div>
  )
}

function extractDateToken(text: string): string | null {
  const match = text.match(
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s*\d{4})?/i,
  )
  return match ? match[0].replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase() : null
}

/** True when Previous/Updated clock fields move to a different calendar day. */
function involvesDateChange(previous: ChangePart[], updated: ChangePart[]): boolean {
  const prevDates = previous.map(p => extractDateToken(p.text)).filter((d): d is string => !!d)
  const nextDates = updated.map(p => extractDateToken(p.text)).filter((d): d is string => !!d)
  if (prevDates.length === 0 || nextDates.length === 0) return false
  return prevDates[0] !== nextDates[0]
}

function itemLabel(
  row: TeachingPlanDisplayRow,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const dateChanged = involvesDateChange(row.previous, row.updated)

  if (
    row.itemKey === 'sessionVenue'
    || row.itemKey === 'sessionTime'
    || row.itemKey === 'sessionTimeVenue'
  ) {
    const params: Record<string, string> = {
      date: row.itemDate ?? '',
    }
    if (row.itemTime) params.time = row.itemTime
    const timed = !!row.itemTime
    if (row.itemKey === 'sessionVenue') {
      return t(timed ? 'teachingPlan.items.sessionVenueTimed' : 'teachingPlan.items.sessionVenue', params)
    }
    if (row.itemKey === 'sessionTime') {
      if (dateChanged) {
        return timed
          ? t('teachingPlan.items.sessionDateTimed', params)
          : t('teachingPlan.items.sessionDate', params)
      }
      return t(timed ? 'teachingPlan.items.sessionTimeTimed' : 'teachingPlan.items.sessionTime', params)
    }
    if (dateChanged) {
      return timed
        ? t('teachingPlan.items.sessionDateVenueTimed', params)
        : t('teachingPlan.items.sessionDateVenue', params)
    }
    return t(
      timed ? 'teachingPlan.items.sessionTimeVenueTimed' : 'teachingPlan.items.sessionTimeVenue',
      params,
    )
  }

  if (row.itemKey === 'lecTimeVenue' || row.itemKey === 'tutTimeVenue' || row.itemKey === 'timeVenue') {
    return t(dateChanged ? 'teachingPlan.items.dateVenue' : 'teachingPlan.items.timeVenue')
  }
  if (
    row.itemKey === 'lecTime'
    || row.itemKey === 'tutTime'
    || row.itemKey === 'time'
    || row.itemKey === 'date'
  ) {
    return t(dateChanged || row.itemKey === 'date' ? 'teachingPlan.items.date' : 'teachingPlan.items.time')
  }
  if (row.itemKey === 'lecVenue' || row.itemKey === 'tutVenue') {
    return t('teachingPlan.items.venue')
  }
  if (row.itemKey === 'dateVenue') {
    return t('teachingPlan.items.dateVenue')
  }

  const params: Record<string, string> = {}
  if (row.itemDate) params.date = row.itemDate
  if (row.itemTime) params.time = row.itemTime
  return t(`teachingPlan.items.${row.itemKey}`, params)
}

function previousPartsForDisplay(row: TeachingPlanDisplayRow): ChangePart[] {
  const dateChanged = involvesDateChange(row.previous, row.updated)
  const updatedHasVenue = row.updated.some(p => p.emoji === 'venue')
  if (dateChanged && updatedHasVenue) {
    return row.previous.filter(p => p.emoji !== 'venue')
  }
  return row.previous
}

function selectedKey(courseCode: string, sectionId: string): string {
  return `${courseCode}::${sectionId}`
}

function buildSelectedSet(selections: SelectedSection[]): Set<string> {
  return new Set(selections.map(s => selectedKey(s.courseCode, s.sectionId)))
}

function buildSelectedCourses(selections: SelectedSection[]): Set<string> {
  return new Set(selections.map(s => s.courseCode))
}

function reflowDisplayFlags(rows: TeachingPlanDisplayRow[]): TeachingPlanDisplayRow[] {
  let prevCourse: string | null = null
  let prevSection: string | null = null
  let prevItemKey: string | null = null
  let prevItemDate: string | null = null
  let prevSessionKind: string | null = null
  let prevItemTime: string | null = null

  return rows.map(row => {
    const section = planRowClassKey(row)
    const itemDate = row.itemDate ?? ''
    const sessionKind = row.sessionKind ?? ''
    const itemTime = row.itemTime ?? ''
    const courseChanged = row.courseCode !== prevCourse
    const classChanged = courseChanged || section !== prevSection
    const showCourse = courseChanged
    const showCourseCode = !courseChanged && classChanged
    const showClass = classChanged && !!row.sectionId
    const showItem =
      classChanged
      || row.itemKey !== prevItemKey
      || itemDate !== prevItemDate
      || sessionKind !== prevSessionKind
      || itemTime !== prevItemTime

    prevCourse = row.courseCode
    prevSection = section
    prevItemKey = row.itemKey
    prevItemDate = itemDate
    prevSessionKind = sessionKind
    prevItemTime = itemTime

    return { ...row, showCourse, showCourseCode, showClass, showItem }
  })
}

/** Whether a change row matters for the user's current plan. */
function rowAffectsUser(
  row: TeachingPlanDisplayRow,
  selectedSet: Set<string>,
  selectedCourses: Set<string>,
): boolean {
  return teachingPlanRowAffectsUser(row, selectedSet, selectedCourses)
}

interface ImpactGroup {
  key: string
  courseCode: string
  courseTitle: string
  sectionId: string
  classLabel: string
  isTutorial: boolean
  changeCount: number
  personal: boolean
}

function buildImpactGroups(
  rows: TeachingPlanDisplayRow[],
  selectedSet: Set<string>,
  selectedCourses: Set<string>,
): ImpactGroup[] {
  const map = new Map<string, ImpactGroup>()
  for (const row of rows) {
    const sectionId = row.sectionId ?? '—'
    const key = `${row.courseCode}::${planRowClassKey(row) || sectionId}`
    const personal = rowAffectsUser(row, selectedSet, selectedCourses)
    const existing = map.get(key)
    if (existing) {
      existing.changeCount += 1
      existing.personal = existing.personal || personal
    } else {
      map.set(key, {
        key,
        courseCode: row.courseCode,
        courseTitle: row.courseTitle,
        sectionId,
        classLabel: planClassColumnText(row),
        isTutorial: isTutorialPlanRow(row),
        changeCount: 1,
        personal,
      })
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.personal !== b.personal) return a.personal ? -1 : 1
    if (a.courseCode !== b.courseCode) return a.courseCode.localeCompare(b.courseCode)
    return a.classLabel.localeCompare(b.classLabel)
  })
}

function impactSectionLabel(
  group: ImpactGroup,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (group.isTutorial) return group.classLabel || t('teachingPlan.impactTut')
  if (group.sectionId === '—') return ''
  return t('teachingPlan.impactClass', { id: group.sectionId })
}

function ChangeTable({
  rows,
  selectedSet,
  highlightSelected,
  t,
}: {
  rows: TeachingPlanDisplayRow[]
  selectedSet: Set<string>
  /** When false (mine-only filter on), skip selected-row tint — all rows are already yours. */
  highlightSelected: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  return (
    <div className="teaching-plan-table-wrap">
      <table className="teaching-plan-table">
        <thead>
          <tr>
            <th>{t('teachingPlan.colCourse')}</th>
            <th>{t('teachingPlan.colClass')}</th>
            <th>{t('teachingPlan.colItem')}</th>
            <th>{t('teachingPlan.colOld')}</th>
            <th>{t('teachingPlan.colNew')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const isSelectedClass = !!(
              highlightSelected
              && row.sectionId
              && !isTutorialPlanRow(row)
              && selectedSet.has(selectedKey(row.courseCode, row.sectionId))
            )
            return (
              <tr
                key={row.key}
                className={isSelectedClass ? 'teaching-plan-row--selected' : undefined}
              >
                <td>
                  {row.showCourse ? (
                    <>
                      <div className="teaching-plan-course-code">{row.courseCode}</div>
                      <div className="teaching-plan-course-title">{row.courseTitle}</div>
                    </>
                  ) : row.showCourseCode ? (
                    <div className="teaching-plan-course-code">{row.courseCode}</div>
                  ) : null}
                </td>
                <td className={isSelectedClass ? 'teaching-plan-class--selected' : undefined}>
                  {row.showClass ? planClassColumnText(row) : null}
                </td>
                <td>{row.showItem ? itemLabel(row, t) : null}</td>
                <td className="teaching-plan-old-cell">
                  <ChangeCell parts={previousPartsForDisplay(row)} hideTimeEmoji />
                </td>
                <td className="teaching-plan-new-cell">
                  <ChangeCell parts={row.updated} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function impactChipClass(isTutorial: boolean, sectionId: string, personal: boolean): string {
  const parts = ['teaching-plan-impact-chip']
  if (personal) parts.push('teaching-plan-impact-chip--personal')
  // Deeper wash only in "affects you"; "other updates" stay white
  if (personal && !isTutorial && sectionId !== '—') {
    parts.push('teaching-plan-impact-chip--lec')
  }
  return parts.join(' ')
}

function NoticeCard({
  notice,
  selectedSet,
  selectedCourses,
  hasAnySelection,
}: {
  notice: TeachingPlanNotice
  selectedSet: Set<string>
  selectedCourses: Set<string>
  hasAnySelection: boolean
}) {
  const { t } = useI18n()
  const { dismissed, dismiss } = usePersistentDismiss(
    teachingPlanDismissStorageKey(notice.id),
    teachingPlanDismissVersion(notice),
    teachingPlanDismissEventName(notice.id),
  )
  const [expanded, setExpanded] = useState(notice.defaultExpanded)
  const displayRows = useMemo(() => buildDisplayRows(notice), [notice])
  const impactGroups = useMemo(
    () => buildImpactGroups(displayRows, selectedSet, selectedCourses),
    [displayRows, selectedSet, selectedCourses],
  )
  const personalGroups = impactGroups.filter(g => g.personal)
  const otherGroups = impactGroups.filter(g => !g.personal)
  const personalCount = personalGroups.reduce((n, g) => n + g.changeCount, 0)

  // Plan A default: focus on "does this affect me?"
  const [mineOnly, setMineOnly] = useState(true)
  const [showDetailTable, setShowDetailTable] = useState(false)

  const canFilterMine = personalCount > 0
  const effectiveMineOnly = canFilterMine && mineOnly
  const visibleRows = useMemo(() => {
    const filtered = effectiveMineOnly
      ? displayRows.filter(row => rowAffectsUser(row, selectedSet, selectedCourses))
      : displayRows
    return reflowDisplayFlags(filtered)
  }, [displayRows, effectiveMineOnly, selectedSet, selectedCourses])

  if (dismissed) return null

  const title = t('teachingPlan.titleDated', {
    timestamp: notice.timestamp,
    courses: notice.courseRefs,
  })

  return (
    <div className={`teaching-plan-notice${expanded ? '' : ' teaching-plan-notice--folded'}`}>
      <div className="teaching-plan-notice-header">
        <button
          type="button"
          className="teaching-plan-notice-toggle"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          <span className="teaching-plan-notice-title">{title}</span>
        </button>
        <div className="teaching-plan-notice-header-end">
          <button
            type="button"
            className="teaching-plan-notice-chevron-btn"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={title}
          >
            <i className={expanded ? 'fas fa-caret-down' : 'fas fa-caret-right'} aria-hidden="true" />
          </button>
          <button type="button" className="notice-dismiss-btn" onClick={dismiss}>
            {t('teachingPlan.dismissRead')}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Adjustment summary sits above personal impact chips */}
          <div className="teaching-plan-notice-text">
            {t(`teachingPlan.${notice.bodyKey}`, notice.bodyParams)}
          </div>

          {/* Plan A — Layer 1: impact summary */}
          <div className="teaching-plan-impact">
            {canFilterMine ? (
              <p className="teaching-plan-impact-lead teaching-plan-impact-lead--personal">
                {t('teachingPlan.impactAffectsYou', { count: personalCount })}
              </p>
            ) : hasAnySelection ? (
              <p className="teaching-plan-impact-lead">
                {t('teachingPlan.impactNotAffected')}
              </p>
            ) : (
              <p className="teaching-plan-impact-lead">
                {t('teachingPlan.impactNoSelection')}
              </p>
            )}

            {personalGroups.length > 0 && (
              <ul className="teaching-plan-impact-list">
                {personalGroups.map(g => (
                  <li key={g.key} className={impactChipClass(g.isTutorial, g.sectionId, true)}>
                    <span className="teaching-plan-impact-chip-code">{g.courseCode}</span>
                    <span className="teaching-plan-impact-chip-section">
                      {impactSectionLabel(g, t)}
                    </span>
                    <span
                      className="teaching-plan-impact-chip-count"
                      title={t('teachingPlan.impactChangeCount', { count: g.changeCount })}
                      aria-label={t('teachingPlan.impactChangeCount', { count: g.changeCount })}
                    >
                      {g.changeCount}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {otherGroups.length > 0 && (
              <details className="teaching-plan-impact-others">
                <summary>
                  <i className="fas fa-caret-right teaching-plan-impact-others-caret teaching-plan-impact-others-caret--closed" aria-hidden="true" />
                  <i className="fas fa-caret-down teaching-plan-impact-others-caret teaching-plan-impact-others-caret--open" aria-hidden="true" />
                  {t('teachingPlan.impactOtherUpdates', { count: otherGroups.length })}
                </summary>
                <ul className="teaching-plan-impact-list teaching-plan-impact-list--muted">
                  {otherGroups.map(g => (
                    <li key={g.key} className={impactChipClass(g.isTutorial, g.sectionId, false)}>
                      <span className="teaching-plan-impact-chip-code">{g.courseCode}</span>
                      <span className="teaching-plan-impact-chip-section">
                        {impactSectionLabel(g, t)}
                      </span>
                      <span
                        className="teaching-plan-impact-chip-count"
                        title={t('teachingPlan.impactChangeCount', { count: g.changeCount })}
                        aria-label={t('teachingPlan.impactChangeCount', { count: g.changeCount })}
                      >
                        {g.changeCount}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="teaching-plan-impact-actions">
            {canFilterMine && (
              <label className="teaching-plan-mine-toggle">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={e => setMineOnly(e.target.checked)}
                />
                {t('teachingPlan.showOnlyMine')}
              </label>
            )}
            <button
              type="button"
              className="teaching-plan-detail-toggle"
              onClick={() => setShowDetailTable(v => !v)}
              aria-expanded={showDetailTable}
            >
              {showDetailTable
                ? t('teachingPlan.hideDetailTable')
                : t('teachingPlan.showDetailTable')}
            </button>
          </div>

          {/* Plan A — Layer 2: full diff table (opt-in) */}
          {showDetailTable && (
            <ChangeTable
              rows={visibleRows}
              selectedSet={selectedSet}
              highlightSelected={!effectiveMineOnly}
              t={t}
            />
          )}
        </>
      )}
    </div>
  )
}

export default function TeachingPlanUpdateNotice({
  selections,
}: {
  selections: SelectedSection[]
}) {
  const { t } = useI18n()
  const unreadIds = useUnreadTeachingPlanNoticeIds()
  const selectedSet = useMemo(() => buildSelectedSet(selections), [selections])
  const selectedCourses = useMemo(() => buildSelectedCourses(selections), [selections])

  if (unreadIds.size === 0) return null

  const visibleNotices = teachingPlanNotices.filter(n => unreadIds.has(n.id))

  return (
    <section className="teaching-plan-section" aria-label={t('teachingPlan.sectionTitle')}>
      <div className="teaching-plan-section-header">
        <h1 className="page-title teaching-plan-section-title">{t('teachingPlan.sectionTitle')}</h1>
        <div className="teaching-plan-section-actions">
          <Link to="/archive/teaching-plan" className="alt-btn teaching-plan-section-btn">
            {t('teachingPlan.reviewAllUpdates')}
          </Link>
          <button
            type="button"
            className="select-btn teaching-plan-section-btn"
            onClick={dismissAllTeachingPlanNotices}
          >
            {t('teachingPlan.markAllRead')}
          </button>
        </div>
      </div>
      {visibleNotices.map(notice => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          selectedSet={selectedSet}
          selectedCourses={selectedCourses}
          hasAnySelection={selections.length > 0}
        />
      ))}
    </section>
  )
}
