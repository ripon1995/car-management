import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PaymentsIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import { PAYMENT_TYPES, type Payment, type PaymentInput } from '../types/payment'
import type { Car } from '../types/car'
import type { MaintenanceRecord } from '../types/maintenance'
import type { CarDoc } from '../types/carDoc'
import './PaymentsPage.css'

const todayIso = new Date().toISOString().slice(0, 10)

const typeLabels: Record<string, string> = {
  monthly_fair: 'Monthly fare',
  service: 'Service',
  document: 'Document',
  other: 'Other',
}

const maintenanceTypeLabels: Record<string, string> = {
  service: 'Service',
  battery: 'Battery',
  tyre: 'Tyre',
  spare_parts: 'Spare parts',
  engine_oil: 'Engine oil',
}

function maintenanceRecordLabel(record: MaintenanceRecord) {
  return `${maintenanceTypeLabels[record.type]} — ${record.service_place}`
}

const docTypeLabels: Record<string, string> = {
  tax_token: 'Tax token',
  fitness: 'Fitness',
  route_permit: 'Route permit',
  registration_certificate: 'Registration certificate',
}

function carDocRecordLabel(doc: CarDoc) {
  return `${docTypeLabels[doc.doc_type]} — ${doc.expiry_date}`
}

const emptyForm: PaymentInput = {
  type: 'monthly_fair',
  associated_maintenance: null,
  associated_cardocs: null,
  car_id: '',
  amount: 0,
  payment_date: todayIso,
  paid_by: '',
  paid_to: '',
  description: '',
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [carDocs, setCarDocs] = useState<CarDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PaymentInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)
  const paidByInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([api.listPayments(), api.listCars(), api.listMaintenance(), api.listCarDocs()])
      .then(([paymentsData, carsData, maintenanceData, carDocsData]) => {
        if (cancelled) return
        setPayments(paymentsData)
        setCars(carsData)
        setMaintenanceRecords(maintenanceData)
        setCarDocs(carDocsData)
      })
      .catch((err) => {
        if (!cancelled) setError(toApiError(err))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function carLabel(carId: string) {
    const car = cars.find((c) => c.id === carId)
    if (!car) return '—'
    return `${car.brand} ${car.model_name ?? ''}`.trim()
  }

  function maintenanceLabel(id: string | null) {
    if (!id) return '—'
    const record = maintenanceRecords.find((r) => r.id === id)
    return record ? maintenanceRecordLabel(record) : '—'
  }

  function carDocLabel(id: string | null) {
    if (!id) return '—'
    const doc = carDocs.find((d) => d.id === id)
    return doc ? carDocRecordLabel(doc) : '—'
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(payment: Payment) {
    setViewingPayment(null)
    setEditingId(payment.id)
    setForm({
      type: payment.type,
      associated_maintenance: payment.associated_maintenance,
      associated_cardocs: payment.associated_cardocs,
      car_id: payment.car_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      paid_by: payment.paid_by,
      paid_to: payment.paid_to,
      description: payment.description ?? '',
    })
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  useEffect(() => {
    if (!isFormOpen) return
    paidByInputRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeForm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen])

  useEffect(() => {
    if (!viewingPayment) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingPayment(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingPayment])

  function handleTypeChange(type: PaymentInput['type']) {
    setForm((f) => ({
      ...f,
      type,
      associated_maintenance: type === 'service' ? f.associated_maintenance : null,
      associated_cardocs: type === 'document' ? f.associated_cardocs : null,
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const payload: PaymentInput = {
      ...form,
      description: form.description || null,
    }
    try {
      if (editingId) {
        const updated = await api.updatePayment(editingId, payload)
        setPayments((prev) => prev.map((payment) => (payment.id === editingId ? updated : payment)))
      } else {
        const created = await api.createPayment(payload)
        setPayments((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(payment: Payment) {
    if (!window.confirm(`Delete this ${typeLabels[payment.type]} payment?`)) return
    try {
      await api.deletePayment(payment.id)
      setPayments((prev) => prev.filter((existing) => existing.id !== payment.id))
    } catch (err) {
      setError(toApiError(err))
    }
  }

  const maintenanceOptions = form.car_id
    ? maintenanceRecords.filter((record) => record.car_id === form.car_id)
    : maintenanceRecords
  const carDocOptions = form.car_id ? carDocs.filter((doc) => doc.car_id === form.car_id) : carDocs

  return (
    <main id="content" className="payments-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <PaymentsIcon />
          </span>
          Payments
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add payment
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="payment-form-title">{editingId ? 'Edit payment' : 'New payment'}</h2>
            <select
              aria-label="Type"
              value={form.type}
              onChange={(event) => handleTypeChange(event.target.value as PaymentInput['type'])}
              required
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
            <select
              aria-label="Car"
              value={form.car_id}
              onChange={(event) => setForm((f) => ({ ...f, car_id: event.target.value }))}
              required
            >
              <option value="" disabled>
                Select car
              </option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {`${car.brand} ${car.model_name ?? ''}`.trim()}
                </option>
              ))}
            </select>
            {form.type === 'service' && (
              <select
                aria-label="Associated maintenance record"
                value={form.associated_maintenance ?? ''}
                onChange={(event) =>
                  setForm((f) => ({ ...f, associated_maintenance: event.target.value || null }))
                }
              >
                <option value="">No linked maintenance record</option>
                {maintenanceOptions.map((record) => (
                  <option key={record.id} value={record.id}>
                    {maintenanceRecordLabel(record)}
                  </option>
                ))}
              </select>
            )}
            {form.type === 'document' && (
              <select
                aria-label="Associated car doc"
                value={form.associated_cardocs ?? ''}
                onChange={(event) =>
                  setForm((f) => ({ ...f, associated_cardocs: event.target.value || null }))
                }
              >
                <option value="">No linked car doc</option>
                {carDocOptions.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {carDocRecordLabel(doc)}
                  </option>
                ))}
              </select>
            )}
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              aria-label="Amount"
              value={form.amount}
              onChange={(event) => setForm((f) => ({ ...f, amount: Number(event.target.value) }))}
              required
            />
            <input
              type="date"
              aria-label="Payment date"
              value={form.payment_date}
              onChange={(event) => setForm((f) => ({ ...f, payment_date: event.target.value }))}
              required
            />
            <input
              ref={paidByInputRef}
              type="text"
              placeholder="Paid by"
              aria-label="Paid by"
              value={form.paid_by}
              onChange={(event) => setForm((f) => ({ ...f, paid_by: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Paid to"
              aria-label="Paid to"
              value={form.paid_to}
              onChange={(event) => setForm((f) => ({ ...f, paid_to: event.target.value }))}
              required
            />
            <textarea
              placeholder="Description (optional)"
              aria-label="Description"
              value={form.description ?? ''}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeForm} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewingPayment && (
        <div className="modal-backdrop" onClick={() => setViewingPayment(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="payment-view-title">{typeLabels[viewingPayment.type]} payment</h2>
            <dl className="detail-list">
              <div>
                <dt>Type</dt>
                <dd>{typeLabels[viewingPayment.type]}</dd>
              </div>
              <div>
                <dt>Car</dt>
                <dd>{carLabel(viewingPayment.car_id)}</dd>
              </div>
              {viewingPayment.type === 'service' && (
                <div>
                  <dt>Linked maintenance</dt>
                  <dd>{maintenanceLabel(viewingPayment.associated_maintenance)}</dd>
                </div>
              )}
              {viewingPayment.type === 'document' && (
                <div>
                  <dt>Linked car doc</dt>
                  <dd>{carDocLabel(viewingPayment.associated_cardocs)}</dd>
                </div>
              )}
              <div>
                <dt>Amount</dt>
                <dd>{viewingPayment.amount}</dd>
              </div>
              <div>
                <dt>Payment date</dt>
                <dd>{viewingPayment.payment_date}</dd>
              </div>
              <div>
                <dt>Paid by</dt>
                <dd>{viewingPayment.paid_by}</dd>
              </div>
              <div>
                <dt>Paid to</dt>
                <dd>{viewingPayment.paid_to}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{viewingPayment.description ?? '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingPayment.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingPayment.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingPayment(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => openEditForm(viewingPayment)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : payments.length === 0 ? (
        <p>No payments yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Car</th>
                <th>Payment date</th>
                <th>Paid by</th>
                <th>Paid to</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={payment.id}>
                  <td>{index + 1}</td>
                  <td>{typeLabels[payment.type]}</td>
                  <td>{payment.amount}</td>
                  <td>{carLabel(payment.car_id)}</td>
                  <td>{payment.payment_date}</td>
                  <td>{payment.paid_by}</td>
                  <td>{payment.paid_to}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View payment`}
                      title="View"
                      onClick={() => setViewingPayment(payment)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit payment`}
                      title="Edit"
                      onClick={() => openEditForm(payment)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete payment`}
                      title="Delete"
                      onClick={() => handleDelete(payment)}
                    >
                      <DeleteIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default PaymentsPage
