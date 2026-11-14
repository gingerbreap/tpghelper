import { useMemo, useState, type KeyboardEvent } from 'react'
import AppDialog from './AppDialog'
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

function chipTitle(summary: string): string {
  const idx = summary.indexOf(':')
  if (idx === -1) return summary
  const rest = summary.slice(idx + 1).trim()
  return `${summary.slice(0, idx + 1)}\n${rest}`
}

/** Customize how calendar events (and ICS) render title/description. */
export default function EventFormatModal({
  events,
  onClose,
  onSaved,
}: EventFormatModalProps) {
  const { t, tList } = useI18n()
  const weekdays = tList('ics.weekdays')
  const [templates, setTemplates] = useState<IcsFormatTemplates>(loadIcsTemplates)
  const [activeTab, setActiveTab] = useState<FormatTab>('class')

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

  const selectTab = (tab: FormatTab) => {
    setActiveTab(tab)
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: FormatTab) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return
    }
    event.preventDefault()
    const order: FormatTab[] = ['class', 'final']
    let next: FormatTab = tab
    if (event.key === 'Home') next = 'class'
    else if (event.key === 'End') next = 'final'
    else if (event.key === 'ArrowRight') next = tab === 'class' ? 'final' : 'class'
    else next = tab === 'final' ? 'class' : 'final'
    selectTab(next)
    document.getElementById(next === 'class' ? 'format-tab-class' : 'format-tab-final')?.focus()
  }

  return (
    <AppDialog
      open
      onClose={onClose}
      className="ics-export-modal"
      labelledBy="event-format-title"
      closeLabel={t('common.close')}
      focusCloseWhenNoAutofocus={false}
    >
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
            className="tab"
            aria-selected={activeTab === 'class'}
            tabIndex={activeTab === 'class' ? 0 : -1}
            onClick={() => selectTab('class')}
            onKeyDown={e => onTabKeyDown(e, 'class')}
          >
            {t('ics.tabClass')}
          </button>
          <button
            type="button"
            role="tab"
            id="format-tab-final"
            className="tab"
            aria-selected={activeTab === 'final'}
            tabIndex={activeTab === 'final' ? 0 : -1}
            onClick={() => selectTab('final')}
            onKeyDown={e => onTabKeyDown(e, 'final')}
          >
            {t('ics.tabFinal')}
          </button>
        </div>

        <div
          id="format-panel-class"
          role="tabpanel"
          aria-labelledby="format-tab-class"
          hidden={activeTab !== 'class'}
        >
          {activeTab === 'class' && (
            <FormatTabFields
              summary={activeSummary}
              description={activeDescription}
              previewEvent={previewEvent}
              previewSummary={previewSummary}
              previewDescription={previewDescription}
              tab="class"
              t={t}
              weekdays={weekdays}
              onSummaryChange={handleSummaryChange}
              onDescriptionChange={handleDescriptionChange}
              onChinese={applyChineseTemplate}
              onEnglish={applyEnglishTemplate}
            />
          )}
        </div>

        <div
          id="format-panel-final"
          role="tabpanel"
          aria-labelledby="format-tab-final"
          hidden={activeTab !== 'final'}
        >
          {activeTab === 'final' && (
            <FormatTabFields
              summary={activeSummary}
              description={activeDescription}
              previewEvent={previewEvent}
              previewSummary={previewSummary}
              previewDescription={previewDescription}
              tab="final"
              t={t}
              weekdays={weekdays}
              onSummaryChange={handleSummaryChange}
              onDescriptionChange={handleDescriptionChange}
              onChinese={applyChineseTemplate}
              onEnglish={applyEnglishTemplate}
            />
          )}
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
    </AppDialog>
  )
}

function FormatTabFields({
  summary,
  description,
  previewEvent,
  previewSummary,
  previewDescription,
  tab,
  t,
  weekdays,
  onSummaryChange,
  onDescriptionChange,
  onChinese,
  onEnglish,
}: {
  summary: string
  description: string
  previewEvent: CalendarEvent | null
  previewSummary: string
  previewDescription: string
  tab: FormatTab
  t: ReturnType<typeof useI18n>['t']
  weekdays: string[]
  onSummaryChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onChinese: () => void
  onEnglish: () => void
}) {
  return (
    <div className="ics-export-tab-panel-inner">
      <h3 className="ics-export-h3">{t('ics.eventTitle')}</h3>
      <input
        id={`event-format-summary-${tab}`}
        type="text"
        className="ics-export-input"
        value={summary}
        autoFocus={tab === 'class'}
        onChange={e => onSummaryChange(e.target.value)}
        spellCheck={false}
      />

      <div className="ics-export-h3-row">
        <h3 className="ics-export-h3">{t('ics.eventDesc')}</h3>
        <div className="ics-export-template-links">
          <button type="button" className="ics-export-link-btn" onClick={onChinese}>
            {t('ics.useChineseTemplate')}
          </button>
          <button type="button" className="ics-export-link-btn" onClick={onEnglish}>
            {t('ics.useEnglishTemplate')}
          </button>
        </div>
      </div>
      <textarea
        id={`event-format-description-${tab}`}
        className="ics-export-textarea"
        rows={5}
        value={description}
        onChange={e => onDescriptionChange(e.target.value)}
        spellCheck={false}
      />

      <h3 className="ics-export-h3">{t('ics.preview')}</h3>
      <PreviewPanels
        event={previewEvent}
        summary={previewSummary}
        description={previewDescription}
        tab={tab}
        t={t}
        weekdays={weekdays}
      />
    </div>
  )
}
