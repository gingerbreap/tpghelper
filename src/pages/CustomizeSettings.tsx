import { useEffect, useState } from 'react'
import AboutBackLink from '../components/AboutBackLink'
import SettingsSegmentedControl from '../components/SettingsSegmentedControl'
import { useI18n } from '../i18n/context'
import {
  getDefaultLanding,
  setDefaultLanding,
  type DefaultLanding,
} from '../utils/appMeta'
import {
  getColorSchemePreference,
  setColorSchemePreference,
  subscribeColorSchemeChange,
  type ColorSchemePreference,
} from '../utils/colorScheme'

const SCHEME_OPTIONS: ColorSchemePreference[] = ['system', 'light', 'dark']
const SCHEME_ICONS: Record<ColorSchemePreference, string> = {
  system: 'fa-circle-half-stroke',
  light: 'fa-sun',
  dark: 'fa-moon',
}

const LANDING_OPTIONS: DefaultLanding[] = ['planner', 'calendar']
const LANDING_ICONS: Record<DefaultLanding, string> = {
  planner: 'fa-user-check',
  calendar: 'fa-calendar-day',
}

export default function CustomizeSettings() {
  const { t } = useI18n()
  const [scheme, setScheme] = useState<ColorSchemePreference>(() => getColorSchemePreference())
  const [landing, setLanding] = useState<DefaultLanding>(() => getDefaultLanding())

  useEffect(() => subscribeColorSchemeChange(() => setScheme(getColorSchemePreference())), [])

  return (
    <div className="about-subpage">
      <AboutBackLink />
      <h1 className="page-title">{t('about.customizeTitle')}</h1>

      <div className="card about-default-card customize-section">
        <h2 className="customize-section-title">{t('about.appearanceTitle')}</h2>
        <SettingsSegmentedControl
          name="color-scheme"
          legend={t('about.appearanceLegend')}
          value={scheme}
          options={SCHEME_OPTIONS.map((value) => ({
            value,
            label: t(`about.appearance.${value}`),
            icon: SCHEME_ICONS[value],
          }))}
          onChange={(next) => {
            setColorSchemePreference(next)
            setScheme(next)
          }}
        />
      </div>

      <div className="card about-default-card customize-section">
        <h2 className="customize-section-title">{t('about.defaultPageTitle')}</h2>
        <SettingsSegmentedControl
          name="default-landing"
          legend={t('about.defaultPageLegend')}
          value={landing}
          options={LANDING_OPTIONS.map((value) => ({
            value,
            label: value === 'planner' ? t('nav.planner') : t('nav.calendar'),
            icon: LANDING_ICONS[value],
          }))}
          onChange={(next) => {
            setDefaultLanding(next)
            setLanding(next)
          }}
        />
      </div>
    </div>
  )
}
