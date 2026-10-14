import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Course, SelectedSection } from '../types'
import { useI18n } from '../i18n/context'
import { getActiveProgramme } from '../programmes'
import type { MeconStreamId } from '../programmes/mecon/streamTags'
import { formatModuleLabelCompact } from '../utils/moduleLabel'
import {
  applyMeconStudyStatusAnswers,
  resolveStudyStatusImport,
  type MeconBootcampChoice,
  type StudyStatusImportResult,
} from '../utils/studyStatusImport'

interface StudyStatusImportModalProps {
  courses: Course[]
  /** Mecon: active stream for type resolution and follow-up prompts. */
  stream?: MeconStreamId | null
  onImport: (selections: SelectedSection[]) => void
  onClose: () => void
}

export default function StudyStatusImportModal({
  courses,
  stream = null,
  onImport,
  onClose,
}: StudyStatusImportModalProps) {
  const { t } = useI18n()
  const programme = getActiveProgramme()
  const isMecon = programme.id === 'mecon'
  const sampleCode = programme.studyStatus.sampleCourseCode
  const [text, setText] = useState('')
  const [result, setResult] = useState<StudyStatusImportResult | null>(null)
  const [bootcamp, setBootcamp] = useState<MeconBootcampChoice>('none')
  const [streamCoreTypes, setStreamCoreTypes] = useState<
    Record<string, 'Stream Core' | 'Elective'>
  >({})

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const hasRecognizedSelections = Boolean(result && result.selections.length > 0)
  const summary = useMemo(() => {
    if (!result) return null
    return t('studyStatus.summary', {
      parsed: result.parsedCount,
      importable: result.selections.length,
    })
  }, [result, t])

  const meconChoicesReady = useMemo(() => {
    if (!result || !isMecon) return true
    const choices = result.meconStreamCoreChoices ?? []
    return choices.every(c => {
      const key = `${c.courseCode}-${c.module}-${c.sectionId}`
      return streamCoreTypes[key] === 'Stream Core' || streamCoreTypes[key] === 'Elective'
    })
  }, [result, isMecon, streamCoreTypes])

  const handleAnalyze = () => {
    const next = resolveStudyStatusImport(text, courses, isMecon ? stream : null)
    setResult(next)
    setBootcamp('none')
    const defaults: Record<string, 'Stream Core' | 'Elective'> = {}
    for (const c of next.meconStreamCoreChoices ?? []) {
      defaults[`${c.courseCode}-${c.module}-${c.sectionId}`] = c.defaultType
    }
    setStreamCoreTypes(defaults)
  }

  const handleImport = () => {
    if (!result || !result.selections.length) return
    if (isMecon) {
      if (!meconChoicesReady) return
      onImport(applyMeconStudyStatusAnswers(result, courses, bootcamp, streamCoreTypes))
    } else {
      onImport(result.selections)
    }
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-window study-status-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-status-import-title"
        onClick={event => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>
        <div className="modal-body study-status-body">
          <h2 id="study-status-import-title" className="study-status-title">
            {t('studyStatus.title')}
          </h2>
          <p className="study-status-intro">
            {t('studyStatus.introBefore')}{' '}
            <a
              href="https://tpg.hkubs.hku.hk/study-status"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('studyStatus.linkText')}
            </a>
            {' '}
            {t('studyStatus.introAfter').split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
          <textarea
            className="study-status-textarea"
            value={text}
            onChange={event => {
              setText(event.target.value)
              setResult(null)
            }}
            placeholder={t('studyStatus.placeholder', { code: sampleCode })}
            spellCheck={false}
          />
          <div className="study-status-actions">
            <button
              type="button"
              className="alt-btn"
              onClick={handleAnalyze}
              disabled={!text.trim()}
            >
              {t('studyStatus.analyze')}
            </button>
            <button
              type="button"
              className="select-btn"
              onClick={handleImport}
              disabled={!hasRecognizedSelections || !meconChoicesReady}
            >
              {t('studyStatus.import')}
            </button>
          </div>

          {result && (
            <div className="study-status-result">
              <strong>{summary}</strong>
              {result.recognized.length > 0 && (
                <ul>
                  {result.recognized.map(({ selection, status }) => (
                    <li key={`${selection.courseCode}-${selection.module}-${selection.sectionId}`}>
                      {status === 'Waiting'
                        ? t('studyStatus.itemWaiting', {
                            code: selection.courseCode,
                            section: selection.sectionId,
                            module: formatModuleLabelCompact(selection.module, t),
                          })
                        : t('studyStatus.item', {
                            code: selection.courseCode,
                            section: selection.sectionId,
                            module: formatModuleLabelCompact(selection.module, t),
                          })}
                    </li>
                  ))}
                </ul>
              )}
              {result.parsedCount === 0 && (
                <p>{t('studyStatus.noneFound')}</p>
              )}
              {result.unmatched.length > 0 && (
                <p className="study-status-warning">
                  {t('studyStatus.unmatched', {
                    list: result.unmatched
                      .map(item => `${item.courseCode} Class ${item.sectionId} (${formatModuleLabelCompact(item.module, t)})`)
                      .join('、'),
                  })}
                </p>
              )}
              {result.duplicateCourseCodes.length > 0 && (
                <p className="study-status-warning">
                  {t('studyStatus.duplicates', { list: result.duplicateCourseCodes.join('、') })}
                </p>
              )}

              {isMecon && result.meconNeedsBootcampPrompt && (
                <div className="study-status-followup">
                  <label className="study-status-followup-label" htmlFor="mecon-bootcamp-choice">
                    {t('studyStatus.meconBootcampPrompt')}
                  </label>
                  <select
                    id="mecon-bootcamp-choice"
                    className="study-status-followup-select"
                    value={bootcamp}
                    onChange={e => setBootcamp(e.target.value as MeconBootcampChoice)}
                  >
                    <option value="none">{t('studyStatus.meconBootcampNone')}</option>
                    <option value="A">{t('studyStatus.meconBootcampClassA')}</option>
                    <option value="B">{t('studyStatus.meconBootcampClassB')}</option>
                  </select>
                </div>
              )}

              {isMecon && (result.meconStreamCoreChoices?.length ?? 0) > 0 && (
                <div className="study-status-followup">
                  <div className="study-status-followup-label">
                    {t('studyStatus.meconStreamCorePrompt')}
                  </div>
                  <ul className="study-status-choice-list">
                    {result.meconStreamCoreChoices!.map(c => {
                      const key = `${c.courseCode}-${c.module}-${c.sectionId}`
                      return (
                        <li key={key} className="study-status-choice-row">
                          <div className="study-status-choice-meta">
                            <strong>{c.courseCode}</strong>
                            {' '}
                            {c.courseTitle}
                            <span className="study-status-choice-period">
                              {formatModuleLabelCompact(c.module, t)}
                            </span>
                          </div>
                          <select
                            className="study-status-followup-select"
                            value={streamCoreTypes[key] ?? c.defaultType}
                            onChange={e => {
                              const value = e.target.value as 'Stream Core' | 'Elective'
                              setStreamCoreTypes(prev => ({ ...prev, [key]: value }))
                            }}
                          >
                            <option value="Stream Core">{t('planner.groupStreamCore')}</option>
                            <option value="Elective">{t('planner.groupElective')}</option>
                          </select>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
