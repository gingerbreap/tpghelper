import ColorSchemeCycleButton from '../../components/ColorSchemeCycleButton'
import { useLanderI18n } from '../i18n/context'
import LanguagePicker from './LanguagePicker'

export default function LanderTopbarUtilities() {
  const { t } = useLanderI18n()

  return (
    <>
      <ColorSchemeCycleButton
        className="lander-scheme-btn"
        labelFor={(pref, resolved) =>
          t('appearance.cycleAria', {
            pref: t(`appearance.${pref}`),
            resolved: t(`appearance.${resolved}`),
          })
        }
      />
      <LanguagePicker />
    </>
  )
}
