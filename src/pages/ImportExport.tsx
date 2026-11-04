import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AboutBackLink from '../components/AboutBackLink'
import { useI18n } from '../i18n/context'
import { getActiveProgramme } from '../programmes'
import { programmeAppPath } from '../session/tpgSession'
import {
  applyUserDataSnapshot,
  buildUserDataSnapshot,
  copyTextToClipboard,
  defaultExportFilename,
  downloadJsonFile,
  beginClipboardReadText,
  parseUserDataJson,
  readFileAsText,
  snapshotToJson,
} from '../utils/userDataTransfer'

type StatusKind = 'ok' | 'error'

interface Status {
  kind: StatusKind
  message: string
}

type ToastKind = 'ok' | 'error'

interface ToastState {
  kind: ToastKind
  message: string
}

const TOAST_MS = 2400

export default function ImportExport() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportJsonRef = useRef<HTMLTextAreaElement>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [exportModalJson, setExportModalJson] = useState<string | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importDraft, setImportDraft] = useState('')
  const [importFieldError, setImportFieldError] = useState(false)
  const [importSubmitLocked, setImportSubmitLocked] = useState(false)

  const showOk = (message: string) => setStatus({ kind: 'ok', message })
  const showError = (message: string) => setStatus({ kind: 'error', message })

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ kind, message })
  }

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!exportModalJson) return
    const el = exportJsonRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [exportModalJson])

  const finishImportSuccess = (targetId: string | null | undefined) => {
    showToast('ok', t('about.transfer.toastImportOk'))
    const targetPath = targetId ? programmeAppPath(targetId) : null
    const activeId = getActiveProgramme().id

    window.setTimeout(() => {
      if (targetPath && targetId && targetId !== activeId) {
        window.location.assign(targetPath)
        return
      }
      navigate('/about', { replace: true })
      window.location.reload()
    }, 400)
  }

  const applyImportText = async (
    text: string,
    opts?: { fromModal?: boolean },
  ): Promise<'ok' | 'invalid' | 'cancelled' | 'failed'> => {
    const parsed = parseUserDataJson(text)
    if (!parsed.ok) {
      if (!opts?.fromModal) {
        showError(
          parsed.error === 'invalidJson'
            ? t('about.transfer.importInvalidJson')
            : t('about.transfer.importInvalidShape'),
        )
      }
      return 'invalid'
    }

    const proceed = window.confirm(t('about.transfer.importConfirm'))
    if (!proceed) {
      if (!opts?.fromModal) showError(t('about.transfer.importCancelled'))
      return 'cancelled'
    }

    try {
      await applyUserDataSnapshot(parsed.data)
    } catch {
      if (!opts?.fromModal) showError(t('about.transfer.importFailed'))
      return 'failed'
    }

    if (!opts?.fromModal) {
      showOk(t('about.transfer.importOk'))
    }
    finishImportSuccess(parsed.data.currentProgramme)
    return 'ok'
  }

  const handleExportFile = async () => {
    setBusy(true)
    try {
      const json = snapshotToJson(await buildUserDataSnapshot())
      downloadJsonFile(json, defaultExportFilename())
      showOk(t('about.transfer.exportFileOk'))
    } catch {
      showError(t('about.transfer.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleExportClipboard = async () => {
    setBusy(true)
    try {
      const json = snapshotToJson(await buildUserDataSnapshot())
      try {
        await copyTextToClipboard(json)
      } catch {
        /* still show modal for manual copy */
      }
      showToast('ok', t('about.transfer.toastCopied'))
      setExportModalJson(json)
    } catch {
      showError(t('about.transfer.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleExportJsonClick = async () => {
    const el = exportJsonRef.current
    if (!el || !exportModalJson) return
    el.focus()
    el.select()
    try {
      await copyTextToClipboard(exportModalJson)
      showToast('ok', t('about.transfer.toastCopied'))
    } catch {
      /* selection still helps manual copy */
    }
  }

  const openImportFallbackModal = (prefill = '') => {
    setImportDraft(prefill)
    setImportFieldError(false)
    setImportSubmitLocked(false)
    setImportModalOpen(true)
  }

  const handleImportClipboard = () => {
    // Must start readText() synchronously in the click turn — any prior await
    // drops Chromium transient activation and denies clipboard-read with no prompt.
    let readPromise: Promise<string>
    try {
      readPromise = beginClipboardReadText()
    } catch {
      showToast('error', t('about.transfer.toastImportFailed'))
      openImportFallbackModal()
      return
    }

    void (async () => {
      setBusy(true)
      try {
        let text = ''
        try {
          text = await readPromise
        } catch {
          showToast('error', t('about.transfer.toastImportFailed'))
          openImportFallbackModal()
          return
        }
        if (!text.trim()) {
          showToast('error', t('about.transfer.toastImportFailed'))
          openImportFallbackModal()
          return
        }

        const result = await applyImportText(text)
        if (result === 'ok') return
        if (result === 'cancelled') return

        showToast('error', t('about.transfer.toastImportFailed'))
        openImportFallbackModal(text)
      } finally {
        setBusy(false)
      }
    })()
  }

  const handleImportModalSubmit = async () => {
    if (importSubmitLocked || busy) return
    setBusy(true)
    setImportFieldError(false)
    try {
      const result = await applyImportText(importDraft, { fromModal: true })
      if (result === 'ok') {
        setImportModalOpen(false)
        return
      }
      if (result === 'cancelled') return

      setImportFieldError(true)
      setImportSubmitLocked(true)
      window.setTimeout(() => setImportSubmitLocked(false), 1000)
    } finally {
      setBusy(false)
    }
  }

  const handleImportFilePick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const text = await readFileAsText(file)
      await applyImportText(text)
    } catch {
      showError(t('about.transfer.importFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="about-subpage">
      <AboutBackLink />
      <h1 className="page-title">{t('about.transfer.title')}</h1>
      <p className="about-transfer-intro">{t('about.transfer.intro')}</p>

      <div className="card about-transfer-card">
        <h2 className="about-transfer-h2">{t('about.transfer.exportTitle')}</h2>
        <p className="about-transfer-desc">{t('about.transfer.exportDesc')}</p>
        <div className="about-transfer-actions">
          <button type="button" className="about-transfer-btn" disabled={busy} onClick={handleExportFile}>
            {t('about.transfer.exportFile')}
          </button>
          <button type="button" className="about-transfer-btn" disabled={busy} onClick={handleExportClipboard}>
            {t('about.transfer.exportClipboard')}
          </button>
        </div>
      </div>

      <div className="card about-transfer-card">
        <h2 className="about-transfer-h2">{t('about.transfer.importTitle')}</h2>
        <p className="about-transfer-desc">{t('about.transfer.importDesc')}</p>
        <div className="about-transfer-actions">
          <button type="button" className="about-transfer-btn" disabled={busy} onClick={handleImportFilePick}>
            {t('about.transfer.importFile')}
          </button>
          <button type="button" className="about-transfer-btn" disabled={busy} onClick={handleImportClipboard}>
            {t('about.transfer.importClipboard')}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="about-transfer-file-input"
          onChange={handleImportFileChange}
        />
      </div>

      {status && (
        <p
          className={
            status.kind === 'ok'
              ? 'about-transfer-status about-transfer-status--ok'
              : 'about-transfer-status about-transfer-status--error'
          }
          role="status"
        >
          {status.message}
        </p>
      )}

      {toast && (
        <div
          className={`transfer-toast transfer-toast--${toast.kind}`}
          role="status"
          aria-live="polite"
        >
          <i
            className={toast.kind === 'ok' ? 'far fa-check-circle' : 'far fa-times-circle'}
            aria-hidden="true"
          />
          <span>{toast.message}</span>
        </div>
      )}

      {exportModalJson != null && (
        <div
          className="modal-overlay"
          onClick={() => setExportModalJson(null)}
          role="presentation"
        >
          <div
            className="modal-window transfer-json-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-export-title"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setExportModalJson(null)}
              aria-label={t('common.close')}
            >
              ×
            </button>
            <div className="modal-body">
              <h2 id="transfer-export-title" className="transfer-json-modal-title">
                {t('about.transfer.exportClipboardModalTitle')}
              </h2>
              <p className="transfer-json-modal-desc">
                {t('about.transfer.exportClipboardModalDesc')}
              </p>
              <textarea
                ref={exportJsonRef}
                className="transfer-json-textarea"
                readOnly
                value={exportModalJson}
                onClick={() => {
                  void handleExportJsonClick()
                }}
                onFocus={e => e.currentTarget.select()}
                aria-label={t('about.transfer.exportClipboardModalTitle')}
              />
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setImportModalOpen(false)}
          role="presentation"
        >
          <div
            className="modal-window transfer-json-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-import-title"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setImportModalOpen(false)}
              aria-label={t('common.close')}
            >
              ×
            </button>
            <div className="modal-body">
              <h2 id="transfer-import-title" className="transfer-json-modal-title">
                {t('about.transfer.importClipboardModalTitle')}
              </h2>
              <p className="transfer-json-modal-desc">
                {t('about.transfer.importClipboardModalDesc')}
              </p>
              <textarea
                className="transfer-json-textarea transfer-json-textarea--editable"
                value={importDraft}
                placeholder={t('about.transfer.importClipboardPlaceholder')}
                onChange={e => {
                  setImportDraft(e.target.value)
                  setImportFieldError(false)
                }}
                aria-label={t('about.transfer.importClipboardModalTitle')}
              />
              <div className="transfer-import-footer">
                {importFieldError && (
                  <span className="transfer-import-error" role="alert">
                    {t('about.transfer.importClipboardInvalid')}
                  </span>
                )}
                <button
                  type="button"
                  className="transfer-import-submit"
                  disabled={busy || importSubmitLocked || !importDraft.trim()}
                  onClick={() => {
                    void handleImportModalSubmit()
                  }}
                >
                  {t('about.transfer.importClipboardSubmit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
