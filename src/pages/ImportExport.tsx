import { useRef, useState, type ChangeEvent } from 'react'
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
  parseUserDataJson,
  readFileAsText,
  readTextFromClipboard,
  snapshotToJson,
} from '../utils/userDataTransfer'

type StatusKind = 'ok' | 'error'

interface Status {
  kind: StatusKind
  message: string
}

export default function ImportExport() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  const showOk = (message: string) => setStatus({ kind: 'ok', message })
  const showError = (message: string) => setStatus({ kind: 'error', message })

  const handleExportFile = () => {
    try {
      const json = snapshotToJson(buildUserDataSnapshot())
      downloadJsonFile(json, defaultExportFilename())
      showOk(t('about.transfer.exportFileOk'))
    } catch {
      showError(t('about.transfer.exportFailed'))
    }
  }

  const handleExportClipboard = async () => {
    setBusy(true)
    try {
      const json = snapshotToJson(buildUserDataSnapshot())
      await copyTextToClipboard(json)
      showOk(t('about.transfer.exportClipboardOk'))
    } catch {
      showError(t('about.transfer.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  const applyImportText = (text: string) => {
    const parsed = parseUserDataJson(text)
    if (!parsed.ok) {
      showError(
        parsed.error === 'invalidJson'
          ? t('about.transfer.importInvalidJson')
          : t('about.transfer.importInvalidShape'),
      )
      return
    }

    const proceed = window.confirm(t('about.transfer.importConfirm'))
    if (!proceed) {
      showError(t('about.transfer.importCancelled'))
      return
    }

    applyUserDataSnapshot(parsed.data)
    showOk(t('about.transfer.importOk'))

    const targetId = parsed.data.currentProgramme
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

  const handleImportClipboard = async () => {
    setBusy(true)
    try {
      const text = await readTextFromClipboard()
      if (!text.trim()) {
        showError(t('about.transfer.importEmptyClipboard'))
        return
      }
      applyImportText(text)
    } catch {
      showError(t('about.transfer.clipboardUnavailable'))
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
      applyImportText(text)
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
            status.kind === 'ok' ? 'about-transfer-status about-transfer-status--ok' : 'about-transfer-status about-transfer-status--error'
          }
          role="status"
        >
          {status.message}
        </p>
      )}
    </div>
  )
}
