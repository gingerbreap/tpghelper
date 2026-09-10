import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/context'
import { getActiveProgramme } from '../programmes'
import type { CalendarEvent } from '../utils/calendarEvents'
import {
  applyIcsTemplate,
  CHINESE_ICS_DESCRIPTION_TEMPLATE,
  CHINESE_ICS_FINAL_DESCRIPTION_TEMPLATE,
  DEFAULT_ICS_TEMPLATES,
  formatIcsPreviewWhen,
  loadIcsTemplates,
  resolveIcsFinalsPreviewEvent,
  resolveIcsPreviewEvent,
  saveIcsTemplates,
  type IcsFormatTemplates,
} from '../utils/icsFormat'

const MODULES = getActiveProgramme().moduleNumbers

const PLACEHOLDER_ROWS = [
  { keys: ['@module'], id: 'module' },
  { keys: ['@code'], id: 'code' },
  { keys: ['@class', '@classchn'], id: 'class' },
  { keys: ['@name'], id: 'name' },
  { keys: ['@type'], id: 'type' },
  { keys: ['@location'], id: 'location' },
  { keys: ['@prof'], id: 'prof' },
] as const

type FormatTab = 'class' | 'final'

interface EventFormatModalProps {
  events: CalendarEvent[]
  onClose: () => void
  /** Called after templates are saved so calendar display can refresh. */
  onSaved?: (templates: IcsFormatTemplates) => void
  /** When false, do not lock body scroll (e.g. stacked over ICS export). */
  lockScroll?: boolean
}

function chipTitle(summary: string): string {
  const idx = summary.indexOf(':')
  if (idx === -1) return summary
  const rest = summary.slice(idx + 1).trim()
  return `${summary.slice(0, idx + 1)}\n${rest}`
}

function PreviewPanels({
  event,
  summary,
  description,
  tab,
  t,
  weekdays,
}: {
  event: CalendarEvent | null
  summary: string
  description: string
  tab: FormatTab
  t: ReturnType<typeof useI18n>['t']
  weekdays: string[]
}) {
  if (!event) {
    const subtitle = tab === 'class' ? t('ics.previewEmptyClass') : t('ics.previewEmptyFinal')
    return (
      <div className="ics-export-preview-panels ics-export-preview-empty">
        <p className="ics-export-empty-notice">
          {t('ics.previewEmpty')}
          <br />
          {subtitle}
        </p>
      </div>
    )
  }

  const when = formatIcsPreviewWhen(event.date, event.startTime, event.endTime, weekdays)

  return (
    <div className="ics-export-preview-panels">
      <div className="ics-preview-chip" aria-label={t('ics.chipPreview')}>
        <div className="ics-preview-chip-title">{chipTitle(summary)}</div>
        {event.startTime && event.endTime && (
          <div className="ics-preview-chip-meta">
            {event.startTime}-{event.endTime}
          </div>
        )}
        {event.venue && (
          <div className="ics-preview-chip-meta">{event.venue}</div>
        )}
      </div>

      <div className="ics-preview-detail" aria-label={t('ics.detailPreview')}>
        <div className="ics-preview-detail-title">{summary}</div>
        <div className="ics-preview-detail-when">{when}</div>
        {event.venue && (
          <div className="ics-preview-detail-row">
            <span className="ics-preview-detail-icon" aria-hidden="true">📍</span>
            <span className="ics-preview-detail-text">{event.venue}</span>
          </div>
        )}
        {description && (
          <div className="ics-preview-detail-row">
            <span className="ics-preview-detail-icon" aria-hidden="true">📝</span>
            <pre className="ics-preview-detail-desc">{description}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

/** Customize how calendar events (and ICS) render title/description. */
export default function EventFormatModal({
  events,
  onClose,
  onSaved,
  lockScroll = true,
}: EventFormatModalProps) {
  const { t, tList } = useI18n()
  const weekdays = tList('ics.weekdays')
  const [templates, setTemplates] = useState<IcsFormatTemplates>(loadIcsTemplates)
  const [activeTab, setActiveTab] = useState<FormatTab>('class')

  useEffect(() => {
    if (!lockScroll) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lockScroll])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const modules = useMemo(() => new Set(MODULES), [])
  const classPreviewEvent = useMemo(
    () => resolveIcsPreviewEvent(events, modules, true, true),
    [events, modules],
  )
  const finalPreviewEvent = useMemo(
    () => resolveIcsFinalsPreviewEvent(events, modules, true, true),
    [events, modules],
  )

  const previewEvent = activeTab === 'class' ? classPreviewEvent : finalPreviewEvent
  const activeSummary = activeTab === 'class' ? templates.summary : templates.finalSummary
  const activeDescription = activeTab === 'class' ? templates.description : templates.finalDescription
  const previewSummary = previewEvent ? applyIcsTemplate(activeSummary, previewEvent) : ''
  const previewDescription = previewEvent ? applyIcsTemplate(activeDescription, previewEvent) : ''

  const handleReset = () => {
    setTemplates({ ...DEFAULT_ICS_TEMPLATES })
  }

  const applyChineseTemplate = () => {
    setTemplates(prev =>
      activeTab === 'class'
        ? { ...prev, description: CHINESE_ICS_DESCRIPTION_TEMPLATE }
        : { ...prev, finalDescription: CHINESE_ICS_FINAL_DESCRIPTION_TEMPLATE },
    )
  }

  const applyEnglishTemplate = () => {
    setTemplates(prev =>
      activeTab === 'class'
        ? { ...prev, description: DEFAULT_ICS_TEMPLATES.description }
        : { ...prev, finalDescription: DEFAULT_ICS_TEMPLATES.finalDescription },
    )
  }

  const handleSummaryChange = (value: string) => {
    setTemplates(prev =>
      activeTab === 'class' ? { ...prev, summary: value } : { ...prev, finalSummary: value },
    )
  }

  const handleDescriptionChange = (value: string) => {
    setTemplates(prev =>
      activeTab === 'class' ? { ...prev, description: value } : { ...prev, finalDescription: value },
    )
  }

  const handleSave = () => {
    saveIcsTemplates(templates)
    onSaved?.(templates)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay modal-overlay--stacked" onClick={onClose} role="presentation">
      <div
        className="modal-window ics-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-format-title"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>

        <div className="modal-body ics-export-body">
          <h2 id="event-format-title" className="ics-export-title">{t('ics.formatTitle')}</h2>
          <p className="ics-export-desc">{t('ics.formatDesc')}</p>

          <table className="ics-export-table">
            <thead>
              <tr>
                <th>{t('ics.colParam')}</th>
                <th>{t('ics.colDesc')}</th>
                <th>{t('ics.colExample')}</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_ROWS.map(row => (
                <tr key={row.keys.join('/')}>
                  <td>
                    {row.keys.map((key, index) => (
                      <span key={key}>
                        {index > 0 ? ' / ' : null}
                        <code>{key}</code>
                      </span>
                    ))}
                  </td>
                  <td>{t(`ics.placeholders.${row.id}.label`)}</td>
                  <td>{t(`ics.placeholders.${row.id}.example`)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="ics-export-location-note">{t('ics.locationNote')}</p>

          <div className="tabs ics-export-tabs" role="tablist" aria-label={t('ics.tabList')}>
            <button
              type="button"
              role="tab"
              id="format-tab-class"
              className={`tab ${activeTab === 'class' ? 'active' : ''}`}
              aria-selected={activeTab === 'class'}
              aria-controls="format-tab-panel"
              onClick={() => setActiveTab('class')}
            >
              {t('ics.tabClass')}
            </button>
            <button
              type="button"
              role="tab"
              id="format-tab-final"
              className={`tab ${activeTab === 'final' ? 'active' : ''}`}
              aria-selected={activeTab === 'final'}
              aria-controls="format-tab-panel"
              onClick={() => setActiveTab('final')}
            >
              {t('ics.tabFinal')}
            </button>
          </div>

          <div
            id="format-tab-panel"
            role="tabpanel"
            aria-labelledby={activeTab === 'class' ? 'format-tab-class' : 'format-tab-final'}
          >
            <h3 className="ics-export-h3">{t('ics.eventTitle')}</h3>
            <input
              id="event-format-summary"
              type="text"
              className="ics-export-input"
              value={activeSummary}
              onChange={e => handleSummaryChange(e.target.value)}
              spellCheck={false}
            />

            <div className="ics-export-h3-row">
              <h3 className="ics-export-h3">{t('ics.eventDesc')}</h3>
              <div className="ics-export-template-links">
                <button type="button" className="ics-export-link-btn" onClick={applyChineseTemplate}>
                  {t('ics.useChineseTemplate')}
                </button>
                <button type="button" className="ics-export-link-btn" onClick={applyEnglishTemplate}>
                  {t('ics.useEnglishTemplate')}
                </button>
              </div>
            </div>
            <textarea
              id="event-format-description"
              className="ics-export-textarea"
              rows={5}
              value={activeDescription}
              onChange={e => handleDescriptionChange(e.target.value)}
              spellCheck={false}
            />

            <h3 className="ics-export-h3">{t('ics.preview')}</h3>
            <PreviewPanels
              event={previewEvent}
              summary={previewSummary}
              description={previewDescription}
              tab={activeTab}
              t={t}
              weekdays={weekdays}
            />
          </div>

          <div className="ics-export-actions">
            <button type="button" className="alt-btn" onClick={handleReset}>
              {t('ics.reset')}
            </button>
            <button type="button" className="select-btn" onClick={handleSave}>
              {t('ics.saveFormat')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
