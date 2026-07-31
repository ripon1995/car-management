import { useEffect, useRef } from 'react'
import Loader from './Loader'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isConfirming) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isConfirming, onCancel])

  if (!open) return null

  return (
    <div className="confirm-dialog-backdrop" onClick={isConfirming ? undefined : onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? 'confirm-dialog-message' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path
              d="M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="confirm-dialog-title">{title}</h2>
        {message && (
          <p id="confirm-dialog-message" className="confirm-dialog-message">
            {message}
          </p>
        )}
        <div className="confirm-dialog-actions">
          <button ref={cancelButtonRef} type="button" className="secondary" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-dialog-confirm" onClick={onConfirm} disabled={isConfirming}>
            {confirmLabel}
          </button>
        </div>
        {isConfirming && (
          <div className="confirm-dialog-overlay">
            <Loader label="Deleting…" />
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfirmDialog
