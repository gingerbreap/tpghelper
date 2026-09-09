import { useNavigate } from 'react-router-dom'
import { useLanderI18n } from '../i18n/context'
import LanguagePicker from '../components/LanguagePicker'

export default function AuthGate() {
  const { t } = useLanderI18n()
  const navigate = useNavigate()

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
            <button
              type="button"
              className="lander-btn lander-btn-login"
              disabled
              aria-disabled="true"
              aria-describedby="lander-login-reason"
            >
              {t('auth.login')}
            </button>
            <p id="lander-login-reason" className="lander-inline-hint">
              {t('auth.loginDisabledReason')}
            </p>

            <button
              type="button"
              className="lander-btn lander-btn-guest"
              onClick={() => navigate('/programmes')}
            >
              {t('auth.guest')}
            </button>
          </div>

          <div className="lander-privacy">
            <p>{t('auth.loginPrivacy')}</p>
            <p>{t('auth.guestPrivacy')}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
