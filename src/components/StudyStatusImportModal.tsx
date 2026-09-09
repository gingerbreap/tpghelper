import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Course, SelectedSection } from '../types'
import { useI18n } from '../i18n/context'
import { getActiveProgramme } from '../programmes'
import {
  resolveStudyStatusImport,
  type StudyStatusImportResult,
} from '../utils/studyStatusImport'

interface StudyStatusImportModalProps {
  courses: Course[]
  onImport: (selections: SelectedSection[]) => void
  onClose: () => void
}

export default function StudyStatusImportModal({
  courses,
  onImport,
  onClose,
}: StudyStatusImportModalProps) {
  const { t } = useI18n()
  const sampleCode = getActiveProgramme().studyStatus.sampleCourseCode
  const [text, setText] = useState('')
  const [result, setResult] = useState<StudyStatusImportResult | null>(null)

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

  const handleAnalyze = () => {
    setResult(resolveStudyStatusImport(text, courses))
  }

  const handleImport = () => {
    if (!result || !result.selections.length) return
    onImport(result.selections)
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
              disabled={!hasRecognizedSelections}
            >
              {t('studyStatus.import')}
            </button>
          </div>

          {result && (
            <div className="study-status-result">
              <strong>{summary}</strong>
              {result.selections.length > 0 && (
                <ul>
                  {result.selections.map(selection => (
                    <li key={`${selection.courseCode}-${selection.module}-${selection.sectionId}`}>
                      {t('studyStatus.item', {
                        code: selection.courseCode,
                        section: selection.sectionId,
                        module: selection.module,
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
                      .map(item => `${item.courseCode} Class ${item.sectionId} (M${item.module})`)
                      .join('、'),
                  })}
                </p>
              )}
              {result.duplicateCourseCodes.length > 0 && (
                <p className="study-status-warning">
                  {t('studyStatus.duplicates', { list: result.duplicateCourseCodes.join('、') })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
