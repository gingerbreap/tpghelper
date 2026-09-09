import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { getActiveProgramme } from '../programmes'

/**
 * Campaign key for this PWA launch prompt.
 * Changing the suffix re-shows the banner once to everyone; keep stable so
 * dismissals never resurface after this release.
 */
function dismissStorageKey(): string {
  return `${getActiveProgramme().id}-pwa-install-banner-dismissed:v1`
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(dismissStorageKey()) === '1'
  } catch {
    return false
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(dismissStorageKey(), '1')
  } catch {
    /* ignore */
  }
}

/** Homepage install hint for every supported platform; once per device after dismiss. */
export default function PwaInstallBanner() {
  const { t } = useI18n()
  const { installed, supported } = usePwaInstall()
  const [visible, setVisible] = useState(() => !isDismissed())

  if (!visible || installed || !supported) return null

  const dismiss = () => {
    markDismissed()
    setVisible(false)
  }

  return (
    <div className="pwa-install-banner" role="region" aria-label={t('about.pwa.bannerAria')}>
      <div className="pwa-install-banner-inner">
        <i className="fa-solid fa-download pwa-install-banner-icon" aria-hidden="true" />
        <p className="pwa-install-banner-text">{t('about.pwa.bannerMessage')}</p>
        <Link
          to="/about/pwa"
          className="pwa-install-banner-link"
          onClick={dismiss}
        >
          {t('about.pwa.bannerAction')}
        </Link>
        <button
          type="button"
          className="pwa-install-banner-dismiss"
          onClick={dismiss}
          aria-label={t('about.pwa.bannerDismiss')}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
