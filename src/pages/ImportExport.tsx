import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AboutBackLink from '../components/AboutBackLink'
import AppDialog from '../components/AppDialog'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
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
  const importDraftRef = useRef<HTMLTextAreaElement>(null)
  const exportCopy = useCopyFeedback()
  const modalCopy = useCopyFeedback()
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

  useEffect(() => {
    if (!importModalOpen) return
    importDraftRef.current?.focus()
  }, [importModalOpen])

  const finishImportSuccess = (targetId: string | null | undefined) => {
    showToast('ok', t('about.transfer.toastImportOk'))
    const targetPath = targetId ? programmeAppPath(targetId) : null
    const activeId = getActiveProgramme().id

    window.setTimeout(() => {
      if (targetPath && targetId && targetId !== activeId) {
        window.location.assign(targetPath)
        return
      }
      navigate('/about', { replace: true, viewTransition: true })
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
      let copied = false
      try {
        await copyTextToClipboard(json)
        copied = true
      } catch {
        /* still show modal for manual copy */
      }
      exportCopy.report(
        copied,
        t('about.transfer.toastCopied'),
        t('about.transfer.toastCopyFailed'),
      )
      setExportModalJson(json)
    } catch {
      showError(t('about.transfer.exportFailed'))
      exportCopy.report(false, t('about.transfer.toastCopied'), t('about.transfer.toastCopyFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleModalCopy = async () => {
    const el = exportJsonRef.current
    if (!el || !exportModalJson) return
    el.focus()
    el.select()
    try {
      await copyTextToClipboard(exportModalJson)
      modalCopy.report(true, t('about.transfer.toastCopied'), t('about.transfer.toastCopyFailed'))
    } catch {
      modalCopy.report(false, t('about.transfer.toastCopied'), t('about.transfer.toastCopyFailed'))
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
          <span className="copy-control">
            <button
              ref={exportCopy.buttonRef}
              type="button"
              className="about-transfer-btn copy-button"
              disabled={busy}
              onClick={() => {
                void handleExportClipboard()
              }}
            >
              <i className="far fa-copy copy-button-icon copy-button-icon--idle" aria-hidden="true" />
              <i className="far fa-check-circle copy-button-icon copy-button-icon--ok" aria-hidden="true" />
              <i className="far fa-times-circle copy-button-icon copy-button-icon--fail" aria-hidden="true" />
              <span>{t('about.transfer.exportClipboard')}</span>
            </button>
            <span ref={exportCopy.tipRef} className="copy-tip" role="status" />
          </span>
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

      {/* Keep live region mounted; fill only when announcing (MWG copy-button / a11y). */}
      <div
        className={`transfer-toast-host${toast ? ' transfer-toast-host--visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <div className={`transfer-toast transfer-toast--${toast.kind}`}>
            <i
              className={toast.kind === 'ok' ? 'far fa-check-circle' : 'far fa-times-circle'}
              aria-hidden="true"
            />
            <span>{toast.message}</span>
          </div>
        )}
      </div>

      <AppDialog
        open={exportModalJson != null}
        onClose={() => setExportModalJson(null)}
        className="transfer-json-modal"
        labelledBy="transfer-export-title"
        closeLabel={t('common.close')}
        focusCloseWhenNoAutofocus={false}
      >
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
            value={exportModalJson ?? ''}
            autoFocus
            onFocus={e => e.currentTarget.select()}
            aria-label={t('about.transfer.exportClipboardModalTitle')}
          />
          <div className="transfer-copy-row">
            <span className="copy-control">
              <button
                ref={modalCopy.buttonRef}
                type="button"
                className="about-transfer-btn copy-button"
                onClick={() => {
                  void handleModalCopy()
                }}
              >
                <i className="far fa-copy copy-button-icon copy-button-icon--idle" aria-hidden="true" />
                <i className="far fa-check-circle copy-button-icon copy-button-icon--ok" aria-hidden="true" />
                <i className="far fa-times-circle copy-button-icon copy-button-icon--fail" aria-hidden="true" />
                <span>{t('about.transfer.exportClipboard')}</span>
              </button>
              <span ref={modalCopy.tipRef} className="copy-tip" role="status" />
            </span>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        className="transfer-json-modal"
        labelledBy="transfer-import-title"
        closeLabel={t('common.close')}
        focusCloseWhenNoAutofocus={false}
      >
        <div className="modal-body">
          <h2 id="transfer-import-title" className="transfer-json-modal-title">
            {t('about.transfer.importClipboardModalTitle')}
          </h2>
          <p className="transfer-json-modal-desc">
            {t('about.transfer.importClipboardModalDesc')}
          </p>
          <textarea
            ref={importDraftRef}
            className="transfer-json-textarea transfer-json-textarea--editable"
            value={importDraft}
            placeholder={t('about.transfer.importClipboardPlaceholder')}
            autoFocus
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
      </AppDialog>
    </div>
  )
}
