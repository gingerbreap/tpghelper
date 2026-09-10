import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanderI18n } from '../i18n/context'
import LanguagePicker from '../components/LanguagePicker'
import {
  getAuthMode,
  programmeAppPath,
  setAuthMode,
} from '../../session/tpgSession'
import { resolveOpenProgrammeId } from '../../utils/siteConfig'

export default function AuthGate() {
  const { t } = useLanderI18n()
  const navigate = useNavigate()

  // PWA start_url is "/": resume currentProgramme from site config (or picker).
  useEffect(() => {
    const auth = getAuthMode()
    if (auth !== 'guest' && auth !== 'logged-in') return

    const preferred = resolveOpenProgrammeId()
    const appPath = preferred ? programmeAppPath(preferred) : null
    if (appPath) {
      window.location.replace(appPath)
      return
    }
    navigate('/programmes', { replace: true })
  }, [navigate])

  return (
    <div className="lander-shell">
      <header className="lander-topbar">
        <LanguagePicker />
      </header>

      <main className="lander-stage">
        <div className="lander-composition">
          <h1 className="lander-brand">{t('brand.name')}</h1>
          <p className="lander-tagline">{t('brand.tagline')}</p>

          <div className="lander-actions" role="group" aria-label={t('brand.name')}>
            <div className="lander-action-block">
              <button
                type="button"
                className="lander-btn lander-btn-login"
                disabled
                aria-disabled="true"
                aria-describedby="lander-login-privacy lander-login-reason"
              >
                {t('auth.login')}
              </button>
              <p id="lander-login-privacy" className="lander-action-note">
                {t('auth.loginPrivacy')}
              </p>
              <p id="lander-login-reason" className="lander-inline-hint">
                {t('auth.loginDisabledReason')}
              </p>
            </div>

            <div className="lander-action-block">
              <button
                type="button"
                className="lander-btn lander-btn-guest"
                onClick={() => {
                  setAuthMode('guest')
                  navigate('/programmes')
                }}
              >
                {t('auth.guest')}
              </button>
              <p className="lander-action-note">{t('auth.guestPrivacy')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
