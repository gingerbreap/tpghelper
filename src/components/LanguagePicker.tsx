import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/context'
import type { Locale } from '../i18n/types'

interface LanguagePickerProps {
  className?: string
}

const LOCALES: Locale[] = ['en', 'zh-CN', 'zh-HK']

export default function LanguagePicker({ className = '' }: LanguagePickerProps) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const first = rootRef.current?.querySelector<HTMLButtonElement>('[role="option"]')
    first?.focus()
  }, [open])

  const choose = (next: Locale) => {
    setLocale(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const labelKey = (code: Locale) => {
    if (code === 'en') return t('lang.en')
    if (code === 'zh-CN') return t('lang.zh')
    return t('lang.zhHK')
  }

  return (
    <div className={`lang-picker-wrap ${className}`.trim()} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="lang-picker-btn"
        onClick={() => setOpen(v => !v)}
        aria-label={t('lang.label')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? menuId : undefined}
      >
        <i className="fa-solid fa-globe" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          className="lang-picker-menu"
          role="listbox"
          aria-label={t('lang.label')}
        >
          {LOCALES.map(code => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={locale === code}
              className={locale === code ? 'active' : ''}
              onClick={() => choose(code)}
            >
              {labelKey(code)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
