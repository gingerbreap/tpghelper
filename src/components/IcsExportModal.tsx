import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/context'
import { filterEventsForIcsExport, type CalendarEvent } from '../utils/calendarEvents'
import { loadIcsTemplates } from '../utils/icsFormat'
import { buildIcsContent, downloadIcs } from '../utils/exportIcs'
import { getActiveProgramme } from '../programmes'

const MODULES = getActiveProgramme().moduleNumbers

interface IcsExportModalProps {
  events: CalendarEvent[]
  onClose: () => void
  /** Opens the shared event-format customization popup (display + ICS). */
  onOpenFormat: () => void
}

export default function IcsExportModal({ events, onClose, onOpenFormat }: IcsExportModalProps) {
  const { t } = useI18n()
  const [modules, setModules] = useState<Set<number>>(() => new Set(MODULES))
  const [includeLecture, setIncludeLecture] = useState(true)
  const [includeTutorial, setIncludeTutorial] = useState(true)

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

  const handleExport = () => {
    if (!canExport) return
    const templates = loadIcsTemplates()
    const content = buildIcsContent(exportableEvents, templates)
    downloadIcs(content)
    onClose()
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-window ics-export-modal ics-export-modal--compact"
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

          <div className="ics-export-format-link-row">
            <p className="ics-export-format-hint">{t('ics.formatReuseHint')}</p>
            <button type="button" className="ics-export-link-btn" onClick={onOpenFormat}>
              {t('ics.openFormat')}
            </button>
          </div>

          {filtersValid && !hasExportableEvents && (
            <p className="ics-export-empty-notice ics-export-empty-notice--export">
              {t('ics.exportEmpty')}
              <br />
              {t('ics.exportEmptySub')}
            </p>
          )}

          <div className="ics-export-actions">
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
