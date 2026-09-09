import { useEffect, useRef, useState } from 'react'
import { useLanderI18n } from '../i18n/context'
import type { Locale } from '../i18n/types'

interface LanguagePickerProps {
  className?: string
}

export default function LanguagePicker({ className = '' }: LanguagePickerProps) {
  const { locale, setLocale, t } = useLanderI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const choose = (next: Locale) => {
    setLocale(next)
    setOpen(false)
  }

  return (
    <div className={`lang-picker-wrap ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="lang-picker-btn lander-lang-btn"
        onClick={() => setOpen(v => !v)}
        aria-label={t('lang.label')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <i className="fa-solid fa-globe" aria-hidden="true" />
      </button>
      {open && (
        <div className="lang-picker-menu" role="listbox" aria-label={t('lang.label')}>
          <button
            type="button"
            role="option"
            aria-selected={locale === 'zh-CN'}
            className={locale === 'zh-CN' ? 'active' : ''}
            onClick={() => choose('zh-CN')}
          >
            {t('lang.zh')}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={locale === 'zh-HK'}
            className={locale === 'zh-HK' ? 'active' : ''}
            onClick={() => choose('zh-HK')}
          >
            {t('lang.zhHK')}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={locale === 'en'}
            className={locale === 'en' ? 'active' : ''}
            onClick={() => choose('en')}
          >
            {t('lang.en')}
          </button>
        </div>
      )}
    </div>
  )
}
