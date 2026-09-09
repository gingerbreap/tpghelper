/** Chromium `beforeinstallprompt` event (not in all TS DOM libs). */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export function isRunningAsInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  } catch {
    /* ignore */
  }
  return false
}

/** iPhone / iPad / iPod, including iPadOS desktop-class UA. */
export function isIosLikeDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  // iPadOS 13+ may report as MacIntel with touch
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export function isAndroidLikeDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function isDesktopSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /Macintosh/i.test(ua)
    && /Safari/i.test(ua)
    && !/Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(ua)
  )
}

function isChromiumLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(ua) && !/Firefox/i.test(ua)
}

/**
 * Whether this browser/OS can install or Add-to-Home-Screen this PWA.
 * Used to hide the navbar install entry and show an unsupported message on the settings page.
 */
export function canOfferPwaInstall(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (!window.isSecureContext) return false
  if (!('serviceWorker' in navigator)) return false

  if (isIosLikeDevice()) return true
  if (isAndroidLikeDevice()) return true
  if (isChromiumLike()) return true
  if (isDesktopSafari()) return true
  return false
}
