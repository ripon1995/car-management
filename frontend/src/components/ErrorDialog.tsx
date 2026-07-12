import { useEffect, useRef } from 'react'
import { ApiError } from '../errors/api'
import './ErrorDialog.css'

interface ErrorDialogProps {
  error: ApiError | null
  onClose: () => void
}

function ErrorDialog({ error, onClose }: ErrorDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!error) return
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [error, onClose])

  if (!error) return null

  return (
    <div className="error-dialog-backdrop" onClick={onClose}>
      <div
        className="error-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-detail"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="error-dialog-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1" fill="currentColor" />
          </svg>
        </div>
        <h2 id="error-dialog-title">{error.message}</h2>
        <p id="error-dialog-detail" className="error-dialog-detail">
          {error.detail}
        </p>
        {(error.errorCode || error.status) && (
          <p className="error-dialog-meta">
            {[error.errorCode, error.status ? `Status ${error.status}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <button ref={closeButtonRef} type="button" className="error-dialog-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

export default ErrorDialog
