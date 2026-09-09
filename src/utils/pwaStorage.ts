import { getActiveProgramme } from '../programmes'

/** Byte length of a string as UTF-8 (approx. storage cost). */
function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length
}

function formatBytes(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) bytes = 0
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  const digits = i === 0 ? 0 : n >= 10 ? 1 : 2
  return `${n.toLocaleString(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: i === 0 ? 0 : undefined,
  })} ${units[i]}`
}

export interface PwaStorageBreakdown {
  appBytes: number
  cacheBytes: number
  userDataBytes: number
  appLabel: string
  cacheLabel: string
  userDataLabel: string
}

/** Sum of Cache Storage entry bodies (installed shell + runtime cache). */
export async function measureCacheBytes(): Promise<number> {
  if (!('caches' in window)) return 0
  let total = 0
  try {
    const names = await caches.keys()
    for (const name of names) {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      for (const request of requests) {
        const response = await cache.match(request)
        if (!response) continue
        try {
          const buffer = await response.clone().arrayBuffer()
          total += buffer.byteLength
        } catch {
          const headerLen = Number(response.headers.get('content-length'))
          if (Number.isFinite(headerLen) && headerLen > 0) total += headerLen
        }
      }
    }
  } catch {
    return total
  }
  return total
}

/** Sum of localStorage keys owned by this programme (`{id}-*`). */
export function measureUserDataBytes(): number {
  const prefix = `${getActiveProgramme().id}-`
  let total = 0
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      const value = localStorage.getItem(key) ?? ''
      total += utf8Bytes(key) + utf8Bytes(value)
    }
  } catch {
    /* ignore */
  }
  return total
}

export async function measurePwaStorage(locale: string): Promise<PwaStorageBreakdown> {
  const cacheBytes = await measureCacheBytes()
  const userDataBytes = measureUserDataBytes()
  const appBytes = cacheBytes + userDataBytes
  return {
    appBytes,
    cacheBytes,
    userDataBytes,
    appLabel: formatBytes(appBytes, locale),
    cacheLabel: formatBytes(cacheBytes, locale),
    userDataLabel: formatBytes(userDataBytes, locale),
  }
}

/** Clear SW + Cache Storage, then hard-navigate to fetch the latest app from the network. */
export async function clearCachesAndReload(): Promise<void> {
  const { origin, pathname, hash } = window.location

  // 1. Unregister first — otherwise the controlling SW can still serve the next load.
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(registration => registration.unregister()))
    }
  } catch {
    /* ignore */
  }

  // 2. Drop Workbox / Cache Storage entries.
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
    }
  } catch {
    /* ignore */
  }

  // 3. Full navigation with a cache-busting query (HashRouter keeps the hash after `?`).
  //    `location.reload()` often reuses disk cache and can stay under the old controller.
  const bust = String(Date.now())
  const documentUrl = `${origin}${pathname}?__pwa_refresh=${bust}`
  try {
    await fetch(documentUrl, {
      cache: 'reload',
      credentials: 'same-origin',
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    /* still navigate even if prefetch fails */
  }

  window.location.replace(`${documentUrl}${hash}`)
}

/** Strip one-shot refresh query added by clearCachesAndReload (keeps the URL clean). */
export function consumePwaRefreshQuery(): void {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('__pwa_refresh')) return
    url.searchParams.delete('__pwa_refresh')
    const search = url.searchParams.toString()
    const next = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
    window.history.replaceState(window.history.state, '', next)
  } catch {
    /* ignore */
  }
}

/** Remove all `{programmeId}-*` localStorage keys, then reload. */
export function resetUserDataAndReload(): void {
  const prefix = `${getActiveProgramme().id}-`
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  window.location.reload()
}
