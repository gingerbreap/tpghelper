import AppDialog from './AppDialog'
import { useI18n } from '../i18n/context'

export default function OtherRequirementsConfirmModal({
  open,
  requirements,
  requirementsZh,
  onConfirm,
  onCancel,
}: {
  open: boolean
  requirements: string[]
  requirementsZh?: string[]
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t, locale } = useI18n()
  const zh = locale === 'zh-CN' || locale === 'zh-HK'
  const items =
    zh && requirementsZh?.length === requirements.length ? requirementsZh : requirements

  return (
    <AppDialog
      open={open}
      onClose={onCancel}
      labelledBy="other-req-title"
      closeLabel={t('common.close')}
    >
      <div className="modal-body">
        <h2 id="other-req-title" style={{ marginTop: 0 }}>
          {t('planner.confirmSelectTitle')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          {t('planner.confirmSelectBody')}
        </p>
        <ul style={{ margin: '0 0 16px', paddingLeft: 20 }}>
          {items.map(item => (
            <li key={item} style={{ marginBottom: 6 }}>
              {item}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="remove-btn" onClick={onCancel} autoFocus>
            {t('planner.confirmSelectCancel')}
          </button>
          <button type="button" className="select-btn" onClick={onConfirm}>
            {t('planner.confirmSelectConfirm')}
          </button>
        </div>
      </div>
    </AppDialog>
  )
}
