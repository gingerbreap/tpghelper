import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'

export default function AboutBackLink() {
  const { t } = useI18n()
  return (
    <div className="about-back">
      <Link to="/about" className="about-back-btn">
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
        <span>{t('about.backToAbout')}</span>
      </Link>
    </div>
  )
}
