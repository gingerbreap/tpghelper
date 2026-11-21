/** Fetch that aborts after `ms` so slow /api (e.g. waking serverless SQL) cannot block UI. */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 4000,
): Promise<Response> {
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
    return fetch(input, init)
  }
  // Prefer a dedicated controller so we do not depend on AbortSignal.any (Safari < 17.4).
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const onOuterAbort = () => controller.abort()
  init.signal?.addEventListener('abort', onOuterAbort)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer)
    init.signal?.removeEventListener('abort', onOuterAbort)
  })
}
