import { Routes, Route, NavLink, Link, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import LanguagePicker from './components/LanguagePicker'
import ProgrammeMismatchGate from './components/ProgrammeMismatchGate'
import Timetable from './pages/Timetable'
import Planner from './pages/Planner'
import Calendar from './pages/Calendar'
import CourseDetail from './pages/CourseDetail'
import Requirements from './pages/Requirements'
import About from './pages/About'
import TeachingPlanArchive from './pages/TeachingPlanArchive'
import DefaultPageSettings from './pages/DefaultPageSettings'
import ImportExport from './pages/ImportExport'
import PwaSettings from './pages/PwaSettings'
import PwaInstallBanner from './components/PwaInstallBanner'
import { useI18n } from './i18n/context'
import { usePwaInstall } from './hooks/usePwaInstall'
import { getActiveProgramme } from './programmes'
import { trackPageView } from './utils/analytics'
import { defaultLandingPath } from './utils/appMeta'

function HomeRedirect() {
  return <Navigate to={defaultLandingPath()} replace />
}

function isAboutPath(pathname: string) {
  return (
    pathname.startsWith('/about')
    || pathname === '/archive/teaching-plan'
    || pathname === '/teaching-plan-archive'
  )
}

function MobileBottomNav() {
  const { t } = useI18n()
  const { pathname } = useLocation()

  const items: Array<{
    to: string
    label: string
    icon: string
    active: boolean
    center?: boolean
  }> = [
    {
      to: '/planner',
      label: t('nav.planner'),
      icon: 'fa-user-check',
      active: pathname === '/planner',
    },
    {
      to: '/courselist',
      label: t('nav.timetable'),
      icon: 'fa-stream',
      active: pathname === '/courselist' || pathname.startsWith('/course/'),
    },
    {
      to: '/calendar',
      label: t('nav.calendar'),
      icon: 'fa-calendar-day',
      active: pathname === '/calendar',
      center: true,
    },
    {
      to: '/requirements',
      label: t('nav.requirements'),
      icon: 'fa-tasks',
      active: pathname === '/requirements',
    },
    {
      to: '/about',
      label: t('nav.about'),
      icon: 'fa-ellipsis-h',
      active: isAboutPath(pathname),
    },
  ]

  return (
    <nav className="mobile-bottom-nav" aria-label={t('nav.brand')}>
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={[
            'mobile-bottom-nav-item',
            item.center && 'mobile-bottom-nav-item--center',
            item.active && 'active',
          ].filter(Boolean).join(' ')}
          aria-current={item.active ? 'page' : undefined}
        >
          {item.center ? (
            <span className="mobile-bottom-nav-center-btn" aria-hidden="true">
              <i className={`fa-solid ${item.icon}`} />
            </span>
          ) : (
            <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
          )}
          <span className="mobile-bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function PwaInstallNavButton() {
  const { t } = useI18n()
  const { installed, supported } = usePwaInstall()
  if (installed || !supported) return null
  return (
    <Link
      to="/about/pwa"
      className="navbar-icon-btn"
      aria-label={t('about.pwa.installAria')}
      title={t('about.pwa.installAria')}
    >
      <i className="fa-solid fa-download" aria-hidden="true" />
    </Link>
  )
}

function App() {
  const { t } = useI18n()
  const programme = getActiveProgramme()
  const location = useLocation()
  const isInitialPageView = useRef(true)

  useEffect(() => {
    const path = `${location.pathname}${location.search}`
    if (isInitialPageView.current) {
      isInitialPageView.current = false
      return
    }
    trackPageView(path)
  }, [location])

  return (
    <>
      <ProgrammeMismatchGate
        currentProgrammeId={programme.id}
        currentShortName={programme.shortName}
      />
      <nav className="navbar">
        <div className="container navbar-inner">
          <NavLink to="/" className="navbar-brand">
            {t('nav.brand')}
          </NavLink>
          <div className="navbar-end">
            <div className="navbar-links">
              <NavLink
                to="/calendar"
                className={location.pathname === '/calendar' ? 'active' : ''}
              >
                {t('nav.calendar')}
              </NavLink>
              <NavLink
                to="/planner"
                className={location.pathname === '/planner' ? 'active' : ''}
              >
                {t('nav.planner')}
              </NavLink>
              <NavLink
                to="/courselist"
                className={location.pathname === '/courselist' ? 'active' : ''}
              >
                {t('nav.timetable')}
              </NavLink>
              <NavLink
                to="/requirements"
                className={location.pathname === '/requirements' ? 'active' : ''}
              >
                {t('nav.requirements')}
              </NavLink>
              <NavLink
                to="/about"
                className={isAboutPath(location.pathname) ? 'active' : ''}
              >
                {t('nav.about')}
              </NavLink>
              <div className="navbar-utilities">
                <PwaInstallNavButton />
                <LanguagePicker className="lang-picker-desktop" />
              </div>
            </div>
            <div className="navbar-mobile-controls">
              <div className="navbar-utilities">
                <PwaInstallNavButton />
                <LanguagePicker className="lang-picker-mobile" />
              </div>
            </div>
          </div>
        </div>
      </nav>
      <PwaInstallBanner />
      <div className="container app-main">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/courselist" element={<Timetable />} />
          <Route path="/course/:courseCode" element={<CourseDetail />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="/about" element={<About />} />
          <Route path="/about/teaching-plan-archive" element={<TeachingPlanArchive />} />
          <Route path="/about/default-page" element={<DefaultPageSettings />} />
          <Route path="/about/import-export" element={<ImportExport />} />
          <Route path="/about/pwa" element={<PwaSettings />} />
          {/* Shared archive aliases (“回顾所有更新” + About menu) */}
          <Route path="/archive/teaching-plan" element={<TeachingPlanArchive />} />
          <Route path="/teaching-plan-archive" element={<TeachingPlanArchive />} />
        </Routes>
      </div>
      <MobileBottomNav />
    </>
  )
}

export default App
