import { useEffect, useState, type FormEvent } from 'react'
import type { Payment, PaymentStatus } from '../types/payment'

export interface MarkPaidUpdates {
  status: PaymentStatus
  paid_by: string
  paid_to: string
  payment_date: string
}

interface MarkPaidDialogProps {
  open: boolean
  payment: Payment | null
  carLabel: string
  typeLabel: string
  isSaving: boolean
  onSave: (updates: MarkPaidUpdates) => void
  onCancel: () => void
}

function MarkPaidDialog({ open, payment, carLabel, typeLabel, isSaving, onSave, onCancel }: MarkPaidDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>('paid')
  const [paidBy, setPaidBy] = useState('')
  const [paidTo, setPaidTo] = useState('')
  const [paymentDate, setPaymentDate] = useState('')

  useEffect(() => {
    if (!open || !payment) return
    setStatus('paid')
    setPaidBy(payment.paid_by)
    setPaidTo(payment.paid_to)
    setPaymentDate(payment.payment_date)
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
    onSave({ status, paid_by: paidBy, paid_to: paidTo, payment_date: paymentDate })
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
        <h2 id="mark-paid-title">Mark payment as paid</h2>
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
        <label className="form-field">
          <span className="form-field-label">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus)} required>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </label>
        <label className="form-field">
          <span className="form-field-label">Paid by</span>
          <input type="text" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} required />
        </label>
        <label className="form-field">
          <span className="form-field-label">Paid to</span>
          <input type="text" value={paidTo} onChange={(event) => setPaidTo(event.target.value)} required />
        </label>
        <label className="form-field">
          <span className="form-field-label">Payment date</span>
          <input
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            required
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MarkPaidDialog
