import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/context'
import { MECON_STREAMS, type MeconStreamId } from '../programmes/mecon/streamTags'
import type { Course, SelectedSection } from '../types'
import {
  applyStreamSwitchPolicy,
  buildStreamSwitchPreview,
  type StreamSwitchPolicy,
} from '../utils/meconStreamSwitch'

interface StreamSwitchModalProps {
  open: boolean
  mode: 'select' | 'switch'
  currentStream: MeconStreamId | null
  courses: Course[]
  selections: SelectedSection[]
  onClose: () => void
  onConfirm: (stream: MeconStreamId, nextSelections: SelectedSection[]) => void
}

const POLICY_OPTIONS: { id: StreamSwitchPolicy; labelKey: string }[] = [
  { id: 'choose', labelKey: 'planner.streamPolicyChoose' },
  { id: 'delete_related', labelKey: 'planner.streamPolicyDeleteRelated' },
  { id: 'delete_core_sc_elective', labelKey: 'planner.streamPolicyDeleteCoreScElective' },
  { id: 'keep_core_sc_elective', labelKey: 'planner.streamPolicyKeepCoreScElective' },
  { id: 'all_elective', labelKey: 'planner.streamPolicyAllElective' },
]

export default function StreamSwitchModal({
  open,
  mode,
  currentStream,
  courses,
  selections,
  onClose,
  onConfirm,
}: StreamSwitchModalProps) {
  const { t } = useI18n()
  const [target, setTarget] = useState<MeconStreamId | null>(currentStream)
  const [policy, setPolicy] = useState<StreamSwitchPolicy>('choose')

  useEffect(() => {
    if (!open) return
    setTarget(mode === 'select' ? null : currentStream)
    setPolicy('choose')
  }, [open, mode, currentStream])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const needsPolicy =
    mode === 'switch'
    && !!currentStream
    && !!target
    && target !== currentStream
    && selections.length > 0

  const preview = useMemo(() => {
    if (!needsPolicy || !currentStream || !target || policy === 'choose') return []
    return buildStreamSwitchPreview(selections, courses, currentStream, target, policy)
  }, [needsPolicy, currentStream, target, policy, selections, courses])

  const canSave =
    !!target
    && (mode === 'select' || target === currentStream || !needsPolicy || policy !== 'choose')

  if (!open) return null

  const handleSave = () => {
    if (!target || !canSave) return
    if (mode === 'select' || !currentStream || target === currentStream || !needsPolicy) {
      onConfirm(target, selections)
      return
    }
    const next = applyStreamSwitchPolicy(selections, courses, currentStream, target, policy)
    onConfirm(target, next)
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-window stream-switch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stream-switch-title"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>
        <div className="modal-body stream-switch-modal-body">
          <h2 id="stream-switch-title" className="stream-switch-title">
            {t('planner.streamSwitchTitle')}
          </h2>

          <div className="stream-switch-info-banner" role="note">
            <i className="fas fa-info-circle" aria-hidden="true" />
            <span>{t('planner.streamSwitchWarning')}</span>
          </div>

          <div className="stream-switch-options" role="radiogroup" aria-label={t('planner.streamSwitchTitle')}>
            {MECON_STREAMS.map(s => (
              <label key={s.id} className={`stream-switch-option${target === s.id ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="mecon-stream"
                  value={s.id}
                  checked={target === s.id}
                  onChange={() => setTarget(s.id)}
                />
                <span className="stream-switch-option-id">{s.id}</span>
                <span className="stream-switch-option-name">{s.name}</span>
              </label>
            ))}
          </div>

          {needsPolicy && (
            <div className="stream-switch-policy">
              <label className="stream-switch-policy-label" htmlFor="stream-switch-policy">
                {t('planner.streamPolicyPrompt')}
              </label>
              <select
                id="stream-switch-policy"
                value={policy}
                onChange={e => setPolicy(e.target.value as StreamSwitchPolicy)}
              >
                {POLICY_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>

              {policy !== 'choose' && (
                <div className="stream-switch-preview">
                  <div className="stream-switch-preview-title">{t('planner.streamPreviewTitle')}</div>
                  {preview.length === 0 ? (
                    <div className="stream-switch-preview-empty">{t('planner.streamPreviewEmpty')}</div>
                  ) : (
                    <div className="stream-switch-preview-table-wrap">
                      <table className="stream-switch-preview-table">
                        <thead>
                          <tr>
                            <th>{t('planner.streamPreviewCode')}</th>
                            <th>{t('planner.streamPreviewTitleCol')}</th>
                            <th>{t('planner.streamPreviewCurrent')}</th>
                            <th>{t('planner.streamPreviewNext')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map(row => (
                            <tr key={`${row.courseCode}-${row.module}-${row.sectionId}`}>
                              <td>{row.courseCode}</td>
                              <td>{row.courseTitle}</td>
                              <td>{row.currentStatus === 'Stream Core' ? 'STM CORE' : row.currentStatus === 'Elective' ? 'ELECTIVES' : row.currentStatus.toUpperCase()}</td>
                              <td>
                                {row.nextStatus === null
                                  ? '✕'
                                  : row.nextStatus === 'Stream Core'
                                    ? 'STM CORE'
                                    : row.nextStatus === 'Elective'
                                      ? 'ELECTIVES'
                                      : row.nextStatus.toUpperCase()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="stream-switch-actions">
            <button type="button" className="remove-btn" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="select-btn"
              disabled={!canSave}
              onClick={handleSave}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
