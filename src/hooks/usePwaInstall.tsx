import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import '@khmyznikov/pwa-install'
import type { PWAInstallElement } from '@khmyznikov/pwa-install'
import { useI18n } from '../i18n/context'
import { APP_SHORT_NAME, appLongName, appManifestHref } from '../utils/appIdentity'
import {
  canOfferPwaInstall,
  isRunningAsInstalledPwa,
} from '../utils/pwaInstall'

interface PwaInstallContextValue {
  installed: boolean
  /** Browser/OS can install or add to Home Screen. */
  supported: boolean
  /** Chromium deferred prompt (or library) is ready for one-tap install. */
  canPrompt: boolean
  showInstallDialog: () => void
  promptInstall: () => Promise<boolean>
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

/** Absolute URL so Lit dialog / Safari always resolve icon correctly. */
function publicAssetUrl(fileName: string): string {
  const path = `${import.meta.env.BASE_URL}${fileName.replace(/^\//, '')}`
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).href
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n()
  const elRef = useRef<PWAInstallElement | null>(null)
  const [installed, setInstalled] = useState(() => isRunningAsInstalledPwa())
  const [supported, setSupported] = useState(() => canOfferPwaInstall())
  const [canPrompt, setCanPrompt] = useState(false)

  const manifestUrl = useMemo(() => {
    const href = appManifestHref(locale)
    if (typeof window === 'undefined') return href
    return new URL(href, window.location.origin).href
  }, [locale])
  const iconUrl = useMemo(() => publicAssetUrl('web-app-manifest-192x192.png'), [])
  const description = useMemo(() => appLongName(locale), [locale])

  const syncFromElement = useCallback(() => {
    const el = elRef.current
    const standalone = isRunningAsInstalledPwa() || Boolean(el?.isUnderStandaloneMode)
    setInstalled(standalone)
    setSupported(canOfferPwaInstall())
    setCanPrompt(Boolean(el?.isInstallAvailable) && !standalone)
  }, [])

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const applyIdentity = () => {
      el.manualApple = true
      el.manualChrome = true
      el.manualHowTo = true
      el.manifestUrl = manifestUrl
      el.name = APP_SHORT_NAME
      el.description = description
      el.icon = iconUrl
      el.styles = { '--tint-color': '#1a73e8' }
      // Keep dialogs manual on Apple, Chromium, and Android-fallback paths.
      el.hideDialog()
    }

    applyIdentity()
    syncFromElement()

    const onAvailable = () => {
      // Android fallback sets isInstallAvailable without hideDialog — force manual.
      applyIdentity()
      syncFromElement()
    }
    const onSuccess = () => {
      setInstalled(true)
      setCanPrompt(false)
    }
    const onChoice = () => syncFromElement()

    el.addEventListener('pwa-install-available-event', onAvailable)
    el.addEventListener('pwa-install-success-event', onSuccess)
    el.addEventListener('pwa-user-choice-result-event', onChoice)
    window.addEventListener('appinstalled', onSuccess)

    const mediaQueries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ]
    for (const mq of mediaQueries) {
      mq.addEventListener('change', syncFromElement)
    }

    // Re-apply after async _init / manifest fetch so name+icon are never blank.
    const timer = window.setTimeout(() => {
      applyIdentity()
      syncFromElement()
    }, 600)

    return () => {
      window.clearTimeout(timer)
      el.removeEventListener('pwa-install-available-event', onAvailable)
      el.removeEventListener('pwa-install-success-event', onSuccess)
      el.removeEventListener('pwa-user-choice-result-event', onChoice)
      window.removeEventListener('appinstalled', onSuccess)
      for (const mq of mediaQueries) {
        mq.removeEventListener('change', syncFromElement)
      }
    }
  }, [description, iconUrl, manifestUrl, syncFromElement])

  const showInstallDialog = useCallback(() => {
    const el = elRef.current
    if (!el) return
    // Force visible even if a prior hideDialog / storage flag suppressed it.
    el.showDialog(true)
  }, [])

  const promptInstall = useCallback(async () => {
    const el = elRef.current
    if (!el) return false
    if (el.isInstallAvailable) {
      el.install()
      return true
    }
    el.showDialog(true)
    return false
  }, [])

  return (
    <PwaInstallContext.Provider
      value={{
        installed,
        supported,
        canPrompt: canPrompt && !installed,
        showInstallDialog,
        promptInstall,
      }}
    >
      {/*
        Attributes must be present on first paint: the element reads them in connectedCallback.
        Setting only in useEffect races Safari desktop (auto dialog + empty name/icon).
      */}
      <pwa-install
        ref={elRef}
        manifest-url={manifestUrl}
        name={APP_SHORT_NAME}
        description={description}
        icon={iconUrl}
        {...({
          'manual-apple': true,
          'manual-chrome': true,
          'manual-how-to': true,
        } as Record<string, boolean>)}
      />
      {children}
    </PwaInstallContext.Provider>
  )
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext)
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider')
  }
  return ctx
}
