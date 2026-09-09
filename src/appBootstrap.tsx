import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { I18nProvider } from './i18n/context'
import App from './App'

export function mountApp(root: Root) {
  root.render(
    <StrictMode>
      <I18nProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </I18nProvider>
    </StrictMode>,
  )
}
