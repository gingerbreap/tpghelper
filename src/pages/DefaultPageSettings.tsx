import { useState } from 'react'
import AboutBackLink from '../components/AboutBackLink'
import { useI18n } from '../i18n/context'
import {
  getDefaultLanding,
  setDefaultLanding,
  type DefaultLanding,
} from '../utils/appMeta'

export default function DefaultPageSettings() {
  const { t } = useI18n()
  const [value, setValue] = useState<DefaultLanding>(() => getDefaultLanding())

  const onChange = (next: DefaultLanding) => {
    setDefaultLanding(next)
    setValue(next)
  }

  return (
    <div className="about-subpage">
      <AboutBackLink />
      <h1 className="page-title">{t('about.defaultPageTitle')}</h1>
      <div className="card about-default-card">
        <fieldset className="about-default-fieldset">
          <legend className="about-default-legend">{t('about.defaultPageLegend')}</legend>
          <label className="about-default-option">
            <input
              type="radio"
              name="default-landing"
              checked={value === 'planner'}
              onChange={() => onChange('planner')}
            />
            <span>{t('nav.planner')}</span>
          </label>
          <label className="about-default-option">
            <input
              type="radio"
              name="default-landing"
              checked={value === 'calendar'}
              onChange={() => onChange('calendar')}
            />
            <span>{t('nav.calendar')}</span>
          </label>
        </fieldset>
      </div>
    </div>
  )
}
