import { useCallback, useRef } from 'react'

const FEEDBACK_MS = 2000

/**
 * MWG copy-button feedback: tip is a live region outside the button;
 * show/hide via opacity (not display/visibility) so announcements work.
 */
export function useCopyFeedback() {
  const tipRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<number | null>(null)

  const report = useCallback((ok: boolean, okMsg: string, failMsg: string) => {
    const tip = tipRef.current
    const button = buttonRef.current
    if (!tip || !button) return

    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    button.removeAttribute('data-copied')
    button.removeAttribute('data-failed')
    tip.textContent = ''
    void button.offsetWidth
    button.setAttribute(ok ? 'data-copied' : 'data-failed', '')
    const message = ok ? okMsg : failMsg
    requestAnimationFrame(() => {
      tip.textContent = message
    })
    timerRef.current = window.setTimeout(() => {
      button.removeAttribute('data-copied')
      button.removeAttribute('data-failed')
      tip.textContent = ''
      timerRef.current = null
    }, FEEDBACK_MS)
  }, [])

  return { tipRef, buttonRef, report }
}
