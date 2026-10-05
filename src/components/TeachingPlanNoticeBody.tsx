import {
  buildDisplayRows,
  isTutorialPlanRow,
  planClassColumnText,
  type ChangePart,
  type TeachingPlanDisplayRow,
  type TeachingPlanNotice,
} from '../data/teachingPlanUpdates'
import { useI18n } from '../i18n/context'
import type { SelectedSection } from '../types'

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

export function buildSelectedSet(selections: SelectedSection[]): Set<string> {
  return new Set(selections.map(s => selectedKey(s.courseCode, s.sectionId)))
}

export function TeachingPlanNoticeBody({
  notice,
  selectedSet,
}: {
  notice: TeachingPlanNotice
  selectedSet?: Set<string>
}) {
  const { t } = useI18n()
  const displayRows = buildDisplayRows(notice)
  const selected = selectedSet ?? new Set<string>()

  return (
    <>
      <div className="teaching-plan-notice-text">
        {t(`teachingPlan.${notice.bodyKey}`, notice.bodyParams)}
      </div>

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
            {displayRows.map(row => {
              const isSelectedClass = !!(
                row.sectionId
                && !isTutorialPlanRow(row)
                && selected.has(selectedKey(row.courseCode, row.sectionId))
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
    </>
  )
}
