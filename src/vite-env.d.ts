/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string
declare const __APP_COMMIT_SHA__: string
declare const __APP_REPO_URL__: string
declare const __PROGRAMME_ID__: 'msba' | 'mgm' | 'lander'

interface Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}
