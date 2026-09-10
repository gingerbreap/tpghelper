import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { landerProgrammesUrl } from '../session/tpgSession'
import {
  formatDataSyncTime,
  getAppCommitSha,
  getAppRepoUrl,
  getAppVersion,
  getCommitUrl,
  getSyncTimezoneMode,
  setSyncTimezoneMode,
  type SyncTimezoneMode,
} from '../utils/appMeta'

export default function About() {
  const { t } = useI18n()
  const [tzMode, setTzMode] = useState<SyncTimezoneMode>(() => getSyncTimezoneMode())
  const version = getAppVersion()
  const sha = getAppCommitSha()
  const commitUrl = getCommitUrl(sha)
  const repoUrl = getAppRepoUrl()
  const syncTime = formatDataSyncTime(tzMode)
  const tzLabel = tzMode === 'HKT' ? t('about.tzHkt') : t('about.tzLocal')

  const toggleTz = () => {
    const next: SyncTimezoneMode = tzMode === 'HKT' ? 'local' : 'HKT'
    setSyncTimezoneMode(next)
    setTzMode(next)
  }

  return (
    <div>
      <div className="about-hero">
        <img
          className="about-logo"
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          width={128}
          height={128}
        />
        <div className="about-tool-name">{t('nav.brand')}</div>
        <div className="about-version">
          {t('about.versionLabel')}
          {version}
          {sha && (
            <>
              {' ('}
              {commitUrl ? (
                <a href={commitUrl} target="_blank" rel="noopener noreferrer">
                  {sha}
                </a>
              ) : (
                sha
              )}
              {')'}
            </>
          )}
        </div>
        <div className="about-sync">
          {t('about.syncLabel')}
          {syncTime}
          {' ('}
          <button type="button" className="about-tz-toggle" onClick={toggleTz}>
            {tzLabel}
          </button>
          {')'}
        </div>
        <a
          className="about-github"
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('about.githubAria')}
          title={t('about.githubAria')}
        >
          <i className="fa-brands fa-github" aria-hidden="true" />
        </a>
      </div>

      <nav className="about-menu" aria-label={t('about.menuLabel')}>
        <Link to="/about/teaching-plan-archive" className="about-menu-item">
          {t('about.menuArchive')}
        </Link>
        <Link to="/about/default-page" className="about-menu-item">
          {t('about.menuDefaultPage')}
        </Link>
        <Link to="/about/import-export" className="about-menu-item">
          {t('about.menuImportExport')}
        </Link>
        <Link to="/about/pwa" className="about-menu-item">
          {t('about.menuPwa')}
        </Link>
        <a href={landerProgrammesUrl()} className="about-menu-item">
          {t('about.menuChangeProgramme')}
        </a>
      </nav>

      <footer className="site-footer">
        <p className="site-footer-credit">{t('footer.credit')}</p>
        <p className="site-footer-disclaimer">{t('footer.disclaimer1')}</p>
        <p className="site-footer-disclaimer">{t('footer.disclaimer2')}</p>
        <p className="site-footer-disclaimer">{t('footer.disclaimer3')}</p>
        <p className="site-footer-disclaimer">{t('footer.disclaimer4')}</p>
      </footer>
    </div>
  )
}
