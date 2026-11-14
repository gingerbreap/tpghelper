import { useEffect, useState } from 'react'
import {
  cycleColorScheme,
  getColorSchemePreference,
  resolveRenderedScheme,
  subscribeColorSchemeChange,
  subscribeSystemScheme,
  type ColorSchemePreference,
  type RenderedScheme,
} from '../utils/colorScheme'

interface ColorSchemeCycleButtonProps {
  className?: string
  /** i18n: current preference → accessible name */
  labelFor: (pref: ColorSchemePreference, resolved: RenderedScheme) => string
}

export default function ColorSchemeCycleButton({
  className = '',
  labelFor,
}: ColorSchemeCycleButtonProps) {
  const [pref, setPref] = useState<ColorSchemePreference>(() => getColorSchemePreference())
  const [resolved, setResolved] = useState<RenderedScheme>(() => resolveRenderedScheme())

  useEffect(() => {
    const sync = () => {
      const next = getColorSchemePreference()
      setPref(next)
      setResolved(resolveRenderedScheme(next))
    }
    const unsubChange = subscribeColorSchemeChange(sync)
    const unsubSystem = subscribeSystemScheme(sync)
    return () => {
      unsubChange()
      unsubSystem()
    }
  }, [])

  const onClick = () => {
    const next = cycleColorScheme(pref)
    setPref(next)
    setResolved(resolveRenderedScheme(next))
  }

  return (
    <button
      type="button"
      className={`color-scheme-cycle-btn ${className}`.trim()}
      onClick={onClick}
      aria-label={labelFor(pref, resolved)}
      title={labelFor(pref, resolved)}
    >
      {pref === 'light' && <i className="fas fa-sun" aria-hidden="true" />}
      {pref === 'dark' && <i className="fas fa-moon" aria-hidden="true" />}
      {pref === 'system' && (
        <span className="color-scheme-system-icon" aria-hidden="true">
          <i className="fas fa-circle-half-stroke color-scheme-system-base" />
          <i
            className={`fas ${resolved === 'dark' ? 'fa-moon' : 'fa-sun'} color-scheme-system-badge`}
          />
        </span>
      )}
    </button>
  )
}
