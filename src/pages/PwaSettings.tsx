import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import AboutBackLink from '../components/AboutBackLink'
import { useI18n } from '../i18n/context'
import { usePwaInstall } from '../hooks/usePwaInstall'
import {
  clearCachesAndReload,
  measurePwaStorage,
  resetUserDataAndReload,
  type PwaStorageBreakdown,
} from '../utils/pwaStorage'

type DialogKind = 'cache' | 'reset1' | 'reset2' | null

function ConfirmDialog({
  title,
  titleClassName,
  body,
  children,
  onClose,
}: {
  title: string
  titleClassName?: string
  body: ReactNode
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-window pwa-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-confirm-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-body pwa-confirm-body">
          <h2 id="pwa-confirm-title" className={titleClassName ?? 'pwa-confirm-title'}>
            {title}
          </h2>
          <div className="pwa-confirm-text">{body}</div>
          <div className="pwa-confirm-actions">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function PwaSettings() {
  const { t, locale } = useI18n()
  const { installed, supported, showInstallDialog } = usePwaInstall()
  const [storage, setStorage] = useState<PwaStorageBreakdown | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!installed) {
      setStorage(null)
      return
    }
    let cancelled = false
    void measurePwaStorage(locale).then(next => {
      if (!cancelled) setStorage(next)
    })
    return () => {
      cancelled = true
    }
  }, [installed, locale])

  const closeDialog = () => {
    if (!busy) setDialog(null)
  }

  const onClearCache = async () => {
    setBusy(true)
    try {
      await clearCachesAndReload()
    } finally {
      setBusy(false)
    }
  }

  const onResetData = () => {
    setBusy(true)
    try {
      resetUserDataAndReload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="about-subpage">
      <AboutBackLink />
      <h1 className="page-title">{t('about.pwa.title')}</h1>
      <p className="pwa-settings-intro">{t('about.pwa.intro')}</p>

      <div className="card about-default-card pwa-settings-card">
        {!supported ? (
          <p className="pwa-settings-unsupported" role="status">
            {t('about.pwa.unsupported')}
          </p>
        ) : installed ? (
          <>
            <p className="pwa-settings-status-hint" role="status">
              {t('about.pwa.installedSuccess')}
            </p>
            <h2 className="pwa-storage-title">{t('about.pwa.storageTitle')}</h2>
            <ul className="pwa-storage-list">
              <li className="pwa-storage-row">
                <div className="pwa-storage-row-main">
                  <span className="pwa-storage-label">{t('about.pwa.storageApp')}</span>
                  <span className="pwa-storage-size">{storage?.appLabel ?? '—'}</span>
                </div>
                <span className="pwa-storage-btn-slot" aria-hidden="true" />
              </li>
              <li className="pwa-storage-row">
                <div className="pwa-storage-row-main">
                  <span className="pwa-storage-label">{t('about.pwa.storageCache')}</span>
                  <span className="pwa-storage-size">{storage?.cacheLabel ?? '—'}</span>
                </div>
                <button
                  type="button"
                  className="pwa-storage-btn pwa-storage-btn--primary-outline"
                  onClick={() => setDialog('cache')}
                >
                  {t('about.pwa.clearCache')}
                </button>
              </li>
              <li className="pwa-storage-row">
                <div className="pwa-storage-row-main">
                  <span className="pwa-storage-label">{t('about.pwa.storageUser')}</span>
                  <span className="pwa-storage-size">{storage?.userDataLabel ?? '—'}</span>
                </div>
                <button
                  type="button"
                  className="pwa-storage-btn pwa-storage-btn--danger-outline"
                  onClick={() => setDialog('reset1')}
                >
                  {t('about.pwa.resetData')}
                </button>
              </li>
            </ul>
          </>
        ) : (
          <>
            <p className="pwa-settings-status-hint" role="status">
              {t('about.pwa.notInstalledHint')}
            </p>
            <div className="pwa-settings-prompt">
              <button
                type="button"
                className="pwa-install-cta"
                onClick={() => showInstallDialog()}
              >
                <i className="fas fa-download" aria-hidden="true" />
                <span>{t('about.pwa.openInstallGuide')}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {dialog === 'cache' && (
        <ConfirmDialog
          title={t('about.pwa.cacheDialogTitle')}
          body={t('about.pwa.cacheDialogBody').split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
          onClose={closeDialog}
        >
          <button
            type="button"
            className="pwa-storage-btn pwa-storage-btn--primary-solid"
            disabled={busy}
            onClick={() => {
              void onClearCache()
            }}
          >
            {t('about.pwa.yes')}
          </button>
          <button
            type="button"
            className="pwa-storage-btn pwa-storage-btn--primary-outline"
            disabled={busy}
            onClick={closeDialog}
          >
            {t('about.pwa.no')}
          </button>
        </ConfirmDialog>
      )}

      {dialog === 'reset1' && (
        <ConfirmDialog
          title={t('about.pwa.resetDialog1Title')}
          titleClassName="pwa-confirm-title pwa-confirm-title--danger"
          body={<p>{t('about.pwa.resetDialog1Body')}</p>}
          onClose={closeDialog}
        >
          <button
            type="button"
            className="pwa-storage-btn pwa-storage-btn--danger-outline"
            disabled={busy}
            onClick={closeDialog}
          >
            {t('about.pwa.back')}
          </button>
          <button
            type="button"
            className="pwa-storage-btn pwa-storage-btn--danger-solid"
            disabled={busy}
            onClick={() => setDialog('reset2')}
          >
            {t('about.pwa.ok')}
          </button>
        </ConfirmDialog>
      )}

      {dialog === 'reset2' && (
        <ConfirmDialog
          title={t('about.pwa.resetDialog2Title')}
          titleClassName="pwa-confirm-title pwa-confirm-title--danger"
          body={<p>{t('about.pwa.resetDialog2Body')}</p>}
          onClose={closeDialog}
        >
          <button
            type="button"
            className="pwa-storage-btn pwa-storage-btn--danger-soft"
            disabled={busy}
            onClick={closeDialog}
          >
            {t('about.pwa.cancel')}
          </button>
          <button
            type="button"
            className="pwa-storage-btn pwa-storage-btn--danger-solid"
            disabled={busy}
            onClick={onResetData}
          >
            {t('about.pwa.confirmDelete')}
          </button>
        </ConfirmDialog>
      )}
    </div>
  )
}
