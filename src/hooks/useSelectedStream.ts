import { useCallback, useEffect, useState } from 'react'
import { getActiveProgramme } from '../programmes'
import type { MeconStreamId } from '../programmes/mecon/streamTags'
import { MECON_STREAMS } from '../programmes/mecon/streamTags'

const VALID = new Set<string>(MECON_STREAMS.map(s => s.id))

function readStream(key: string): MeconStreamId | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw && VALID.has(raw)) return raw as MeconStreamId
  } catch {
    // ignore
  }
  return null
}

export function useSelectedStream() {
  const programme = getActiveProgramme()
  const storageKey = programme.storage.selectedStream
  const required = !!programme.features.requireStreamSelection && !!storageKey

  const [stream, setStreamState] = useState<MeconStreamId | null>(() =>
    required && storageKey ? readStream(storageKey) : null,
  )

  useEffect(() => {
    if (!required || !storageKey) {
      setStreamState(null)
      return
    }
    setStreamState(readStream(storageKey))
  }, [required, storageKey])

  const setStream = useCallback(
    (next: MeconStreamId | null) => {
      if (!storageKey) return
      try {
        if (next) localStorage.setItem(storageKey, next)
        else localStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
      setStreamState(next)
    },
    [storageKey],
  )

  return {
    stream,
    setStream,
    required,
    streams: MECON_STREAMS,
  }
}
