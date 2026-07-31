import { useEffect, useState, type FormEvent } from 'react'
import { PAID_BY_METHODS, type PaymentStatus } from '../types/payment'
import Loader from './Loader'

export interface MarkPaidUpdates {
  status: PaymentStatus
  paid_by: string
  paid_to: string
  payment_date: string
  description: string | null
}

/** Common shape both Payment and Income share — the fields this dialog reads/edits. */
export interface MarkPaidTarget {
  status: PaymentStatus
  paid_by: string
  paid_to: string
  payment_date: string
  description: string | null
  amount: number | string
}

interface MarkPaidDialogProps {
  open: boolean
  payment: MarkPaidTarget | null
  carLabel: string
  typeLabel: string
  title?: string
  /** When true, only Status/Payment date/Description are shown — for a quick
   * status confirmation where Amount/Car/Type/Paid by/Paid to are already
   * correct and don't need re-entry (e.g. Income's "mark as received"). */
  simple?: boolean
  /** When true, "Paid by" renders as free text instead of the PAID_BY_METHODS
   * select — e.g. Income's paid_by is a vendor name, not a payment method. */
  paidByAsText?: boolean
  isSaving: boolean
  onSave: (updates: MarkPaidUpdates) => void
  onCancel: () => void
}

function MarkPaidDialog({
  open,
  payment,
  carLabel,
  typeLabel,
  title = 'Mark payment as paid',
  simple = false,
  paidByAsText = false,
  isSaving,
  onSave,
  onCancel,
}: MarkPaidDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>('paid')
  const [paidBy, setPaidBy] = useState('')
  const [paidTo, setPaidTo] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open || !payment) return
    setStatus(payment.status)
    setPaidBy(payment.paid_by)
    setPaidTo(payment.paid_to)
    setPaymentDate(payment.payment_date)
    setDescription(payment.description ?? '')
  }, [open, payment])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSaving) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isSaving, onCancel])

  if (!open || !payment) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSave({
      status,
      paid_by: paidBy,
      paid_to: paidTo,
      payment_date: paymentDate,
      description: description || null,
    })
  }

  return (
    <div className="modal-backdrop" onClick={isSaving ? undefined : onCancel}>
      <form
        className="modal-panel card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-paid-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="mark-paid-title">{title}</h2>
        {!simple && (
          <>
            <label className="form-field">
              <span className="form-field-label">Amount</span>
              <span>{payment.amount}</span>
            </label>
            <label className="form-field">
              <span className="form-field-label">Car</span>
              <span>{carLabel}</span>
            </label>
            <label className="form-field">
              <span className="form-field-label">Type</span>
              <span>{typeLabel}</span>
            </label>
          </>
        )}
        <label className="form-field">
          <span className="form-field-label">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus)} required>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </label>
        {!simple && (
          <>
            <label className="form-field">
              <span className="form-field-label">Paid by</span>
              {paidByAsText ? (
                <input type="text" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} required />
              ) : (
                <select value={paidBy} onChange={(event) => setPaidBy(event.target.value)} required>
                  <option value="" disabled>
                    Select payment method
                  </option>
                  {PAID_BY_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="form-field">
              <span className="form-field-label">Paid to</span>
              <input type="text" value={paidTo} onChange={(event) => setPaidTo(event.target.value)} required />
            </label>
          </>
        )}
        <label className="form-field">
          <span className="form-field-label">Payment date</span>
          <input
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span className="form-field-label">Description (optional)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {isSaving && (
          <div className="modal-panel-overlay">
            <Loader label="Saving…" />
          </div>
        )}
      </form>
    </div>
  )
}

export default MarkPaidDialog
