import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
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
import { useI18n } from './i18n/context'
import { getActiveProgramme } from './programmes'
import { trackPageView } from './utils/analytics'
import { defaultLandingPath } from './utils/appMeta'

function HomeRedirect() {
  return <Navigate to={defaultLandingPath()} replace />
}

function App() {
  const { t } = useI18n()
  const programme = getActiveProgramme()
  const [menuOpen, setMenuOpen] = useState(false)
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

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <ProgrammeMismatchGate
        currentProgrammeId={programme.id}
        currentShortName={programme.shortName}
      />
      <nav className="navbar">
        <div className="container navbar-inner">
          <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
            {t('nav.brand')}
          </NavLink>
          <div className="navbar-end">
            <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
              <NavLink
                to="/calendar"
                className={location.pathname === '/calendar' ? 'active' : ''}
                onClick={closeMenu}
              >
                {t('nav.calendar')}
              </NavLink>
              <NavLink
                to="/planner"
                className={location.pathname === '/planner' ? 'active' : ''}
                onClick={closeMenu}
              >
                {t('nav.planner')}
              </NavLink>
              <NavLink
                to="/courselist"
                className={location.pathname === '/courselist' ? 'active' : ''}
                onClick={closeMenu}
              >
                {t('nav.timetable')}
              </NavLink>
              <NavLink
                to="/requirements"
                className={location.pathname === '/requirements' ? 'active' : ''}
                onClick={closeMenu}
              >
                {t('nav.requirements')}
              </NavLink>
              <NavLink
                to="/about"
                className={location.pathname.startsWith('/about') ? 'active' : ''}
                onClick={closeMenu}
              >
                {t('nav.about')}
              </NavLink>
              <LanguagePicker className="lang-picker-desktop" />
            </div>
            <div className="navbar-mobile-controls">
              <LanguagePicker className="lang-picker-mobile" />
              <button type="button" className="menu-toggle navbar-icon-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                <i className="fa-solid fa-bars" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="container" style={{ paddingTop: 8, paddingBottom: 24 }}>
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
          {/* Shared archive aliases (“回顾所有更新” + About menu) */}
          <Route path="/archive/teaching-plan" element={<TeachingPlanArchive />} />
          <Route path="/teaching-plan-archive" element={<TeachingPlanArchive />} />
        </Routes>
        <footer className="site-footer">
          <p className="site-footer-credit">{t('footer.credit')}</p>
          <p className="site-footer-disclaimer">{t('footer.disclaimer1')}</p>
          <p className="site-footer-disclaimer">{t('footer.disclaimer2')}</p>
          <p className="site-footer-disclaimer">{t('footer.disclaimer3')}</p>
        </footer>
      </div>
    </>
  )
}

export default App
