import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { LanderI18nProvider } from './i18n/context'
import LanderApp from './App'

export function mountLander(root: Root) {
  // Root-scoped SW so one install can cover /, /msba/, /mgm/ (manifest scope: "/").
  registerSW({ immediate: true })

  root.render(
    <StrictMode>
      <LanderI18nProvider>
        <HashRouter>
          <LanderApp />
        </HashRouter>
      </LanderI18nProvider>
    </StrictMode>,
  )
}
