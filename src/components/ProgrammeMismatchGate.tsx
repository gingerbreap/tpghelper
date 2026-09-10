import { useI18n } from '../i18n/context'
import {
  landerProgrammesUrl,
  programmeAppPath,
} from '../session/tpgSession'
import {
  getProgrammeShortName,
  resolveOpenProgrammeId,
  syncCurrentProgramme,
} from '../utils/siteConfig'
import type { ProgrammeId } from '../programmes/types'

interface ProgrammeMismatchGateProps {
  /** Programme id of the app currently loaded (msba | mgm). */
  currentProgrammeId: string
  currentShortName: string
}

export default function ProgrammeMismatchGate({
  currentProgrammeId,
  currentShortName,
}: ProgrammeMismatchGateProps) {
  const { t } = useI18n()
  const preferred = resolveOpenProgrammeId()
  if (!preferred || preferred === currentProgrammeId) return null

  const preferredPath = programmeAppPath(preferred)
  const preferredLabel = getProgrammeShortName(preferred)

  return (
    <div className="programme-mismatch-overlay" role="dialog" aria-modal="true" aria-labelledby="programme-mismatch-title">
      <div className="programme-mismatch-card">
        <h1 id="programme-mismatch-title" className="programme-mismatch-title">
          {t('mismatch.title')}
        </h1>
        <p className="programme-mismatch-body">
          {t('mismatch.body', {
            preferred: preferredLabel,
            current: currentShortName,
          })}
        </p>
        <div className="programme-mismatch-actions">
          {preferredPath && (
            <button
              type="button"
              className="lander-btn lander-btn-guest"
              onClick={() => {
                window.location.assign(preferredPath)
              }}
            >
              {t('mismatch.returnPreferred', { preferred: preferredLabel })}
            </button>
          )}
          <button
            type="button"
            className="lander-btn lander-btn-secondary"
            onClick={() => {
              syncCurrentProgramme(currentProgrammeId as ProgrammeId)
              window.location.reload()
            }}
          >
            {t('mismatch.switchHere', { current: currentShortName })}
          </button>
          <button
            type="button"
            className="lander-btn lander-btn-secondary"
            onClick={() => {
              window.location.assign(landerProgrammesUrl())
            }}
          >
            {t('mismatch.pickAgain')}
          </button>
        </div>
      </div>
    </div>
  )
}
