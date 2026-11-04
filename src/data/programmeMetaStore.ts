/**
 * Runtime programme meta (HKT data-sync stamp) for About.
 * Prefer /api → public meta.json → pack compile-time fallback.
 */
import { getActiveProgramme } from '../programmes'

const packFallback = getActiveProgramme().dataSync

let dataSyncHkt = packFallback
let source: 'pack' | 'api' | 'json' | 'pending' = 'pack'
const listeners = new Set<() => void>()

export function getProgrammeDataSync(): string {
  return dataSyncHkt
}

export function getProgrammeMetaSource() {
  return source
}

export function subscribeProgrammeMeta(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function emit() {
  for (const listener of listeners) listener()
}

export function setProgrammeDataSync(
  next: string,
  nextSource: typeof source = 'api',
) {
  dataSyncHkt = next.trim()
  source = nextSource
  emit()
}

function readHkt(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as {
    dataSyncHkt?: unknown
    dataSync?: unknown
    meta?: unknown
  }
  if (typeof obj.dataSyncHkt === 'string' && obj.dataSyncHkt.trim()) {
    return obj.dataSyncHkt.trim()
  }
  if (typeof obj.dataSync === 'string' && obj.dataSync.trim()) {
    return obj.dataSync.trim()
  }
  if (
    obj.dataSync &&
    typeof obj.dataSync === 'object' &&
    typeof (obj.dataSync as { display?: unknown }).display === 'string'
  ) {
    const display = (obj.dataSync as { display: string }).display.trim()
    if (display) return display
  }
  if (obj.meta && typeof obj.meta === 'object') {
    return readHkt(obj.meta)
  }
  return null
}

/**
 * Hydrate from catalogue API, then pack-local JSON, then compiled pack.
 */
export async function loadProgrammeMeta(): Promise<typeof source> {
  const programme = getActiveProgramme()
  const base = import.meta.env.BASE_URL

  try {
    const apiRes = await fetch(`/api/programmes/${programme.id}/meta`)
    if (apiRes.ok) {
      const body: unknown = await apiRes.json()
      const hkt = readHkt(body)
      if (hkt) {
        setProgrammeDataSync(hkt, 'api')
        return 'api'
      }
    }
  } catch {
    /* API missing in vite-only mode */
  }

  try {
    const res = await fetch(`${base}meta.json`)
    if (res.ok) {
      const data: unknown = await res.json()
      const hkt = readHkt(data)
      if (hkt) {
        setProgrammeDataSync(hkt, 'json')
        return 'json'
      }
    }
  } catch {
    /* ignore */
  }

  setProgrammeDataSync(packFallback, 'pack')
  return 'pack'
}
