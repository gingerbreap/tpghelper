import { useI18n } from '../i18n/context'

interface PageLoadingProps {
  compact?: boolean
}

/** In-shell busy state — keeps chrome; avoids blank "Loading..." takeover. */
export default function PageLoading({ compact = false }: PageLoadingProps) {
  const { t } = useI18n()
  return (
    <div
      className={`page-loading${compact ? ' page-loading--compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <progress className="loading-spinner" aria-label={t('common.loading')} />
      <span className="page-loading-label">{t('common.loading')}</span>
    </div>
  )
}
