import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface SettingsSegmentOption<T extends string> {
  value: T
  label: string
  /** Font Awesome solid icon class, e.g. `fa-sun` */
  icon: string
}

interface SettingsSegmentedControlProps<T extends string> {
  name: string
  legend: string
  value: T
  options: SettingsSegmentOption<T>[]
  onChange: (value: T) => void
}

/**
 * Segmented picker: icon-above-label in a row when it fits;
 * icon-left list when the row would overflow (measured via hidden probe).
 */
export default function SettingsSegmentedControl<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: SettingsSegmentedControlProps<T>) {
  const hostRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [listLayout, setListLayout] = useState(false)

  const syncLayout = () => {
    const host = hostRef.current
    const measure = measureRef.current
    if (!host || !measure) return
    setListLayout(measure.scrollWidth > host.clientWidth + 1)
  }

  useLayoutEffect(() => {
    syncLayout()
  }, [options, legend, value])

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => syncLayout())
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  return (
    <fieldset className="settings-seg-fieldset">
      <legend className="settings-seg-legend">{legend}</legend>
      <div className="settings-seg-host" ref={hostRef}>
        {/* Always-horizontal probe for overflow; not interactive */}
        <div className="settings-seg settings-seg--measure" ref={measureRef} aria-hidden="true">
          {options.map((opt) => (
            <span key={opt.value} className="settings-seg-item">
              <i className={`fa-solid ${opt.icon}`} />
              <span className="settings-seg-label">{opt.label}</span>
            </span>
          ))}
        </div>

        <div
          className={['settings-seg', listLayout && 'settings-seg--list'].filter(Boolean).join(' ')}
          role="radiogroup"
          aria-label={legend}
        >
          {options.map((opt) => {
            const selected = value === opt.value
            return (
              <label
                key={opt.value}
                className={['settings-seg-item', selected && 'is-selected'].filter(Boolean).join(' ')}
              >
                <input
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={selected}
                  onChange={() => onChange(opt.value)}
                />
                <i className={`fa-solid ${opt.icon}`} aria-hidden="true" />
                <span className="settings-seg-label">{opt.label}</span>
              </label>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}
