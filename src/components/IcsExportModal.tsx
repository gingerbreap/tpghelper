import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/context'
import { filterEventsForIcsExport, type CalendarEvent } from '../utils/calendarEvents'
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
import { buildIcsContent, downloadIcs } from '../utils/exportIcs'
import { getActiveProgramme } from '../programmes'

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

type IcsFormatTab = 'class' | 'final'

interface IcsExportModalProps {
  events: CalendarEvent[]
  onClose: () => void
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
  tab: IcsFormatTab
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

export default function IcsExportModal({ events, onClose }: IcsExportModalProps) {
  const { t, tList } = useI18n()
  const weekdays = tList('ics.weekdays')
  const [templates, setTemplates] = useState<IcsFormatTemplates>(loadIcsTemplates)
  const [modules, setModules] = useState<Set<number>>(() => new Set(MODULES))
  const [includeLecture, setIncludeLecture] = useState(true)
  const [includeTutorial, setIncludeTutorial] = useState(true)
  const [activeTab, setActiveTab] = useState<IcsFormatTab>('class')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const allModulesSelected = MODULES.every(m => modules.has(m))
  const noModuleSelected = modules.size === 0
  const noSessionSelected = !includeLecture && !includeTutorial
  const filtersValid = !noModuleSelected && !noSessionSelected

  const exportableEvents = useMemo(
    () => (filtersValid
      ? filterEventsForIcsExport(events, modules, includeLecture, includeTutorial)
      : []),
    [events, modules, includeLecture, includeTutorial, filtersValid],
  )
  const hasExportableEvents = exportableEvents.length > 0
  const canExport = filtersValid && hasExportableEvents

  const classPreviewEvent = useMemo(
    () => resolveIcsPreviewEvent(events, modules, includeLecture, includeTutorial),
    [events, modules, includeLecture, includeTutorial],
  )
  const finalPreviewEvent = useMemo(
    () => resolveIcsFinalsPreviewEvent(events, modules, includeLecture, includeTutorial),
    [events, modules, includeLecture, includeTutorial],
  )

  const previewEvent = activeTab === 'class' ? classPreviewEvent : finalPreviewEvent
  const activeSummary = activeTab === 'class' ? templates.summary : templates.finalSummary
  const activeDescription = activeTab === 'class' ? templates.description : templates.finalDescription
  const previewSummary = previewEvent ? applyIcsTemplate(activeSummary, previewEvent) : ''
  const previewDescription = previewEvent ? applyIcsTemplate(activeDescription, previewEvent) : ''

  const toggleModule = (mod: number) => {
    setModules(prev => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
  }

  const toggleAllModules = () => {
    setModules(allModulesSelected ? new Set() : new Set(MODULES))
  }

  const handleReset = () => {
    setTemplates({ ...DEFAULT_ICS_TEMPLATES })
  }

  const applyChineseTemplate = () => {
    setTemplates(t =>
      activeTab === 'class'
        ? { ...t, description: CHINESE_ICS_DESCRIPTION_TEMPLATE }
        : { ...t, finalDescription: CHINESE_ICS_FINAL_DESCRIPTION_TEMPLATE },
    )
  }

  const applyEnglishTemplate = () => {
    setTemplates(t =>
      activeTab === 'class'
        ? { ...t, description: DEFAULT_ICS_TEMPLATES.description }
        : { ...t, finalDescription: DEFAULT_ICS_TEMPLATES.finalDescription },
    )
  }

  const handleSummaryChange = (value: string) => {
    setTemplates(t =>
      activeTab === 'class' ? { ...t, summary: value } : { ...t, finalSummary: value },
    )
  }

  const handleDescriptionChange = (value: string) => {
    setTemplates(t =>
      activeTab === 'class' ? { ...t, description: value } : { ...t, finalDescription: value },
    )
  }

  const handleExport = () => {
    if (!canExport) return
    saveIcsTemplates(templates)
    const content = buildIcsContent(exportableEvents, templates)
    downloadIcs(content, 'hkubs-ba-planner.ics')
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-window ics-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ics-export-title"
        onClick={e => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>

        <div className="modal-body ics-export-body">
          <h2 id="ics-export-title" className="ics-export-title">{t('ics.title')}</h2>

          <h2 className="ics-export-h2">{t('ics.filterTitle')}</h2>

          <h3 className="ics-export-h3">{t('ics.moduleQuestion')}</h3>
          <div className="ics-export-checks" role="group" aria-label={t('ics.selectModules')}>
            {MODULES.map(mod => (
              <label key={mod} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={modules.has(mod)}
                  onChange={() => toggleModule(mod)}
                />
                M{mod}
              </label>
            ))}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={allModulesSelected}
                onChange={toggleAllModules}
              />
              {t('ics.toggleAll')}
            </label>
          </div>
          {noModuleSelected && (
            <div className="ics-export-required">{t('common.requiredOne')}</div>
          )}

          <h3 className="ics-export-h3">{t('ics.sessionQuestion')}</h3>
          <div className="ics-export-checks" role="group" aria-label={t('ics.selectSessionType')}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeLecture}
                onChange={() => setIncludeLecture(v => !v)}
              />
              Lecture
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeTutorial}
                onChange={() => setIncludeTutorial(v => !v)}
              />
              Tutorial
            </label>
          </div>
          {noSessionSelected && (
            <div className="ics-export-required">{t('common.requiredOne')}</div>
          )}

          <h2 className="ics-export-h2">{t('ics.formatTitle')}</h2>
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
              id="ics-tab-class"
              className={`tab ${activeTab === 'class' ? 'active' : ''}`}
              aria-selected={activeTab === 'class'}
              aria-controls="ics-tab-panel"
              onClick={() => setActiveTab('class')}
            >
              {t('ics.tabClass')}
            </button>
            <button
              type="button"
              role="tab"
              id="ics-tab-final"
              className={`tab ${activeTab === 'final' ? 'active' : ''}`}
              aria-selected={activeTab === 'final'}
              aria-controls="ics-tab-panel"
              onClick={() => setActiveTab('final')}
            >
              {t('ics.tabFinal')}
            </button>
          </div>

          <div
            id="ics-tab-panel"
            role="tabpanel"
            aria-labelledby={activeTab === 'class' ? 'ics-tab-class' : 'ics-tab-final'}
          >
            <h3 className="ics-export-h3">{t('ics.eventTitle')}</h3>
            <input
              id="ics-summary"
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
              id="ics-description"
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

          {filtersValid && !hasExportableEvents && (
            <p className="ics-export-empty-notice ics-export-empty-notice--export">
              {t('ics.exportEmpty')}
              <br />
              {t('ics.exportEmptySub')}
            </p>
          )}

          <div className="ics-export-actions">
            <button type="button" className="alt-btn" onClick={handleReset}>
              {t('ics.reset')}
            </button>
            <button
              type="button"
              className="select-btn"
              onClick={handleExport}
              disabled={!canExport}
            >
              {t('ics.exportBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
