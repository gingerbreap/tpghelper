import { useEffect, useRef, type ReactNode } from 'react'

export type AppDialogClosedBy = 'any' | 'closerequest' | 'none'

export interface AppDialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Extra class names on the native `<dialog>` (e.g. `stream-switch-modal`). */
  className?: string
  labelledBy?: string
  label?: string
  /** Default `any` matches previous overlay click-to-dismiss. */
  closedBy?: AppDialogClosedBy
  showCloseButton?: boolean
  closeLabel?: string
  /** Block Esc / light-dismiss (e.g. busy destructive confirm). */
  preventClose?: boolean
  /**
   * When no child has `autofocus`, focus the close control (detail dialogs).
   * Confirm flows should put `autoFocus` on the safe action instead.
   */
  focusCloseWhenNoAutofocus?: boolean
}

const supportsClosedBy =
  typeof HTMLDialogElement !== 'undefined'
  && 'closedBy' in HTMLDialogElement.prototype

/**
 * Modal dialog via native `<dialog>.showModal()`.
 * No role="dialog" / aria-modal / body overflow / Esc handlers — the platform owns those.
 */
export default function AppDialog({
  open,
  onClose,
  children,
  className = '',
  labelledBy,
  label,
  closedBy = 'any',
  showCloseButton = true,
  closeLabel = 'Close',
  preventClose = false,
  focusCloseWhenNoAutofocus = true,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const closingFromProp = useRef(false)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.setAttribute('closedby', closedBy)
  }, [closedBy])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      if (closingFromProp.current) {
        closingFromProp.current = false
        return
      }
      onCloseRef.current()
    }

    const handleCancel = (event: Event) => {
      if (preventClose || closedBy === 'none') {
        event.preventDefault()
      }
    }

    dialog.addEventListener('close', handleClose)
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('close', handleClose)
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [preventClose, closedBy])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
      if (focusCloseWhenNoAutofocus && showCloseButton) {
        requestAnimationFrame(() => {
          if (!dialog.open) return
          if (dialog.querySelector('[autofocus]')) return
          closeRef.current?.focus()
        })
      }
      return
    }
    if (dialog.open) {
      closingFromProp.current = true
      dialog.close()
    }
  }, [open, focusCloseWhenNoAutofocus, showCloseButton])

  // closedby light-dismiss fallback (Safari / older engines)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open || closedBy !== 'any' || supportsClosedBy) return

    let pressedOutside = false
    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect()
      return (
        event.clientX < rect.left
        || event.clientX > rect.right
        || event.clientY < rect.top
        || event.clientY > rect.bottom
      )
    }

    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event)
    }
    const onPointerUp = (event: PointerEvent) => {
      if (preventClose) return
      if (pressedOutside && isOutside(event)) dialog.close()
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointerup', onPointerUp)
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointerup', onPointerUp)
    }
  }, [open, closedBy, preventClose])

  return (
    <dialog
      ref={dialogRef}
      className={`modal-window ${className}`.trim()}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
    >
      {showCloseButton && (
        <button
          ref={closeRef}
          type="button"
          className="modal-close"
          aria-label={closeLabel}
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
      )}
      {children}
    </dialog>
  )
}
