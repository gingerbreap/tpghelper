import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LanguagePicker from '../components/LanguagePicker'
import { useLanderI18n } from '../i18n/context'
import { syncCurrentProgramme } from '../../utils/siteConfig'
import {
  LANDER_PROGRAMMES,
  getLanderProgramme,
  type LanderProgrammeId,
} from '../programmes'

export default function ProgrammePicker() {
  const { t } = useLanderI18n()
  const navigate = useNavigate()
  const listId = useId()
  const helperId = useId()
  const nextHintId = useId()
  const [selectedId, setSelectedId] = useState<LanderProgrammeId | null>(null)

  const selected = selectedId ? getLanderProgramme(selectedId) : undefined
  const canContinue = Boolean(selected?.available && selected.appPath)

  const goNext = () => {
    if (!selected?.available || !selected.appPath) return
    syncCurrentProgramme(selected.id)
    window.location.assign(selected.appPath)
  }

  return (
    <div className="lander-shell">
      <header className="lander-topbar">
        <LanguagePicker />
      </header>

      <main className="lander-stage lander-stage--picker">
        <div className="lander-composition lander-composition--wide">
          <h1 className="lander-picker-title">{t('programmes.title')}</h1>

          <ul
            id={listId}
            className="lander-programme-matrix"
            role="listbox"
            aria-label={t('programmes.title')}
            aria-activedescendant={selectedId ? `${listId}-${selectedId}` : undefined}
          >
            {LANDER_PROGRAMMES.map(prog => {
              const selectedItem = selectedId === prog.id
              const itemId = `${listId}-${prog.id}`
              return (
                <li key={prog.id} role="presentation" className="lander-programme-cell">
                  <button
                    type="button"
                    id={itemId}
                    role="option"
                    aria-selected={selectedItem}
                    aria-disabled={!prog.available}
                    disabled={!prog.available}
                    className={[
                      'lander-programme-item',
                      prog.available ? 'is-available' : 'is-unavailable',
                      selectedItem ? 'is-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      if (!prog.available) return
                      setSelectedId(prog.id)
                    }}
                    onKeyDown={event => {
                      if (!prog.available) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedId(prog.id)
                      }
                    }}
                    title={prog.available ? undefined : t('programmes.unavailable')}
                  >
                    <span className="lander-programme-bullet" aria-hidden="true">
                      {selectedItem ? '●' : '○'}
                    </span>
                    <span className="lander-programme-name">{t(prog.nameKey)}</span>
                    {!prog.available && (
                      <span className="lander-programme-status">{t('programmes.unavailable')}</span>
                    )}
                    {prog.available && selectedItem && (
                      <span className="lander-programme-status is-selected-label">
                        {t('programmes.selected')}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          <p id={helperId} className="lander-helper">
            {t('programmes.helper')}
          </p>

          <div className="lander-nav-actions">
            <button
              type="button"
              className="lander-btn lander-btn-secondary"
              onClick={() => navigate('/')}
            >
              {t('programmes.back')}
            </button>
            <button
              type="button"
              className="lander-btn lander-btn-guest"
              disabled={!canContinue}
              aria-disabled={!canContinue}
              aria-describedby={!canContinue ? nextHintId : helperId}
              onClick={goNext}
            >
              {t('programmes.next')}
            </button>
          </div>
          {!canContinue && (
            <p id={nextHintId} className="lander-inline-hint">
              {t('programmes.nextDisabledReason')}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
