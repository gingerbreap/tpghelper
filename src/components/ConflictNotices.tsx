import { useMemo, useState } from 'react'
import { usePersistentDismiss } from '../hooks/usePersistentDismiss'
import { formatSectionText, formatSectionWithTypeText, useI18n } from '../i18n/context'
import {
  formatConflictWhen,
  tutorialConflictFingerprint,
  type GroupedConflicts,
  type PairConflict,
} from '../utils/conflicts'
import { getActiveProgramme } from '../programmes'

const programme = getActiveProgramme()
const TUTORIAL_DISMISS_KEY = `${programme.id}-dismiss-tutorial-conflicts`
const TUTORIAL_DISMISS_EVENT = `${programme.id}:dismiss-tutorial-conflicts`

interface ConflictNoticesProps {
  conflicts: GroupedConflicts
}

function LectureLine({ pair, count }: { pair: PairConflict; count: number }) {
  const { t } = useI18n()
  return (
    <li>
      {formatSectionText(t, pair.a.courseCode, pair.a.sectionId)} - {formatSectionText(t, pair.b.courseCode, pair.b.sectionId)} ｜{t('conflicts.overlapCount', { count })}
    </li>
  )
}

function OccurrenceLine({
  pair,
  date,
  startTime,
  endTime,
}: {
  pair: PairConflict
  date: string
  startTime: string
  endTime: string
}) {
  const { t } = useI18n()
  return (
    <li>
      {formatSectionText(t, pair.a.courseCode, pair.a.sectionId)} - {formatSectionText(t, pair.b.courseCode, pair.b.sectionId)} | {date} {startTime}-{endTime}
    </li>
  )
}

function TutorialLine({ pair, occurrenceIndex }: { pair: PairConflict; occurrenceIndex: number }) {
  const { t } = useI18n()
  const occurrence = pair.tutorialOverlaps[occurrenceIndex]
  const aText = formatSectionWithTypeText(t, pair.a.courseCode, pair.a.sectionId, occurrence.aSessionType)
  const bText = formatSectionWithTypeText(t, pair.b.courseCode, pair.b.sectionId, occurrence.bSessionType)
  return (
    <li>
      {occurrence.aSessionType === 'lecture' ? <strong>{aText}</strong> : aText}
      {' - '}
      {occurrence.bSessionType === 'lecture' ? <strong>{bText}</strong> : bText}
      {' | '}
      {formatConflictWhen(occurrence)}
    </li>
  )
}

export default function ConflictNotices({ conflicts }: ConflictNoticesProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const fingerprint = useMemo(
    () => tutorialConflictFingerprint(conflicts.tutorial),
    [conflicts.tutorial],
  )
  const { dismissed, dismiss } = usePersistentDismiss(
    TUTORIAL_DISMISS_KEY,
    fingerprint,
    TUTORIAL_DISMISS_EVENT,
  )

  const tutorialLines = conflicts.tutorial.flatMap(pair =>
    pair.tutorialOverlaps.map((_, index) => ({ pair, index })),
  )
  const showTutorial = tutorialLines.length > 0 && !dismissed
  const collapsible = tutorialLines.length > 1

  if (
    conflicts.severeLecture.length === 0
    && conflicts.lecture.length === 0
    && !showTutorial
  ) {
    return null
  }

  return (
    <>
      {conflicts.severeLecture.length > 0 && (
        <div className="conflict-alert conflict-error">
          <div className="conflict-alert-header">
            {t('conflicts.severeHeader')}
          </div>
          <ul className="conflict-alert-list">
            {conflicts.severeLecture.map(pair => (
              <LectureLine
                key={`${pair.a.courseCode}-${pair.a.sectionId}-${pair.b.courseCode}-${pair.b.sectionId}`}
                pair={pair}
                count={pair.lectureOverlaps.length}
              />
            ))}
          </ul>
        </div>
      )}

      {conflicts.lecture.length > 0 && (
        <div className="conflict-alert conflict-error">
          <div className="conflict-alert-header">
            {t('conflicts.lectureHeader')}
          </div>
          <ul className="conflict-alert-list">
            {conflicts.lecture.flatMap(pair =>
              pair.lectureOverlaps.map(occurrence => (
                <OccurrenceLine
                  key={`${pair.a.courseCode}-${pair.a.sectionId}-${pair.b.courseCode}-${pair.b.sectionId}-${occurrence.date}-${occurrence.startTime}`}
                  pair={pair}
                  date={occurrence.date}
                  startTime={occurrence.startTime}
                  endTime={occurrence.endTime}
                />
              )),
            )}
          </ul>
        </div>
      )}

      {showTutorial && (
        <div className="conflict-alert conflict-warning">
          <button type="button" className="notice-dismiss-btn" onClick={dismiss}>
            {t('common.dismiss')}
          </button>
          <div className="conflict-alert-header">
            {t('conflicts.tutorialHeader')}
          </div>
          <ul
            className={`conflict-alert-list${collapsible && !expanded ? ' conflict-alert-list--collapsed' : ''}`}
          >
            {tutorialLines.map(({ pair, index }) => (
              <TutorialLine
                key={`${pair.a.courseCode}-${pair.a.sectionId}-${pair.b.courseCode}-${pair.b.sectionId}-${index}`}
                pair={pair}
                occurrenceIndex={index}
              />
            ))}
          </ul>
          {collapsible && (
            <button
              type="button"
              className="conflict-alert-toggle"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? t('conflicts.collapse') : t('conflicts.expand')}
              <i
                className={`fas ${expanded ? 'fa-caret-down' : 'fa-caret-right'} conflict-alert-toggle-icon`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      )}
    </>
  )
}
