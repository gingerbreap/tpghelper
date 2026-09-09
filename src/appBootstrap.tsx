import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { I18nProvider } from './i18n/context'
import { PwaInstallProvider } from './hooks/usePwaInstall'
import { consumePwaRefreshQuery } from './utils/pwaStorage'
import App from './App'

export function mountApp(root: Root) {
  consumePwaRefreshQuery()
  registerSW({ immediate: true })

  root.render(
    <StrictMode>
      <I18nProvider>
        <PwaInstallProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </PwaInstallProvider>
      </I18nProvider>
    </StrictMode>,
  )
}
