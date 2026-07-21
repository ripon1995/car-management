import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PaymentsIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import { PAYMENT_TYPES, type Payment, type PaymentInput } from '../types/payment'
import { carDisplayLabel, type Car } from '../types/car'
import type { MaintenanceRecord } from '../types/maintenance'
import type { CarDoc } from '../types/carDoc'
import type { FuelRecord } from '../types/fuel'
import type { Enrollment } from '../types/enrollment'
import type { Vendor } from '../types/vendor'
import './PaymentsPage.css'

const todayIso = new Date().toISOString().slice(0, 10)

const typeLabels: Record<string, string> = {
  monthly_fair: 'Monthly fare',
  service: 'Service',
  document: 'Document',
  fuel: 'Fuel',
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

const fuelTypeLabels: Record<string, string> = {
  octane: 'Octane',
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  other: 'Other',
}

function fuelRecordLabel(record: FuelRecord) {
  return `${fuelTypeLabels[record.fuel_type]} — ${record.fuel_station}`
}

const emptyForm: PaymentInput = {
  type: 'monthly_fair',
  associated_maintenance: null,
  associated_cardocs: null,
  associated_fuel: null,
  associated_enrollment: null,
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
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
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
    Promise.all([
      api.listPayments(),
      api.listCars(),
      api.listMaintenance(),
      api.listCarDocs(),
      api.listFuelRecords(),
      api.listEnrollments(),
      api.listVendors(),
    ])
      .then(([paymentsData, carsData, maintenanceData, carDocsData, fuelData, enrollmentsData, vendorsData]) => {
        if (cancelled) return
        setPayments(paymentsData)
        setCars(carsData)
        setMaintenanceRecords(maintenanceData)
        setCarDocs(carDocsData)
        setFuelRecords(fuelData)
        setEnrollments(enrollmentsData)
        setVendors(vendorsData)
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
    return carDisplayLabel(car)
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

  function fuelLabel(id: string | null) {
    if (!id) return '—'
    const record = fuelRecords.find((r) => r.id === id)
    return record ? fuelRecordLabel(record) : '—'
  }

  function enrollmentRecordLabel(enrollment: Enrollment) {
    const vendorName = vendors.find((v) => v.id === enrollment.vendor_id)?.name ?? 'Unknown vendor'
    return `${vendorName} — ${enrollment.monthly_fare}/mo`
  }

  function enrollmentLabel(id: string | null) {
    if (!id) return '—'
    const enrollment = enrollments.find((e) => e.id === id)
    return enrollment ? enrollmentRecordLabel(enrollment) : '—'
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
      associated_fuel: payment.associated_fuel,
      associated_enrollment: payment.associated_enrollment,
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
      associated_fuel: type === 'fuel' ? f.associated_fuel : null,
      associated_enrollment: type === 'monthly_fair' ? f.associated_enrollment : null,
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const linkedEnrollment =
      form.type === 'monthly_fair'
        ? enrollments.find((e) => e.id === form.associated_enrollment)
        : null
    const payload: PaymentInput = {
      ...form,
      amount: linkedEnrollment ? linkedEnrollment.monthly_fare : form.amount,
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
  const fuelOptions = form.car_id
    ? fuelRecords.filter((record) => record.car_id === form.car_id)
    : fuelRecords
  const enrollmentOptions = form.car_id
    ? enrollments.filter((enrollment) => enrollment.car_id === form.car_id)
    : enrollments

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
            <label className="form-field">
              <span className="form-field-label">Type</span>
              <select
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
            </label>
            <label className="form-field">
              <span className="form-field-label">Car</span>
              <select
                value={form.car_id}
                onChange={(event) => setForm((f) => ({ ...f, car_id: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select car
                </option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {carDisplayLabel(car)}
                  </option>
                ))}
              </select>
            </label>
            {form.type === 'service' && (
              <label className="form-field">
                <span className="form-field-label">Linked maintenance (optional)</span>
                <select
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
              </label>
            )}
            {form.type === 'document' && (
              <label className="form-field">
                <span className="form-field-label">Linked car doc (optional)</span>
                <select
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
              </label>
            )}
            {form.type === 'fuel' && (
              <label className="form-field">
                <span className="form-field-label">Linked fuel record (optional)</span>
                <select
                  value={form.associated_fuel ?? ''}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, associated_fuel: event.target.value || null }))
                  }
                >
                  <option value="">No linked fuel record</option>
                  {fuelOptions.map((record) => (
                    <option key={record.id} value={record.id}>
                      {fuelRecordLabel(record)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {form.type === 'monthly_fair' && (
              <label className="form-field">
                <span className="form-field-label">Linked enrollment</span>
                <select
                  value={form.associated_enrollment ?? ''}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, associated_enrollment: event.target.value || null }))
                  }
                  required
                >
                  <option value="" disabled>
                    Select enrollment
                  </option>
                  {enrollmentOptions.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollmentRecordLabel(enrollment)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {form.type !== 'monthly_fair' && (
              <label className="form-field">
                <span className="form-field-label">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1500.00"
                  value={form.amount === 0 ? '' : form.amount}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      amount: event.target.value === '' ? 0 : Number(event.target.value),
                    }))
                  }
                  required
                />
              </label>
            )}
            <label className="form-field">
              <span className="form-field-label">Payment date</span>
              <div className="field-with-hint">
                <input
                  type="date"
                  value={form.payment_date}
                  onChange={(event) => setForm((f) => ({ ...f, payment_date: event.target.value }))}
                  required
                />
                <span className="field-hint">Date the payment was made — format YYYY-MM-DD</span>
              </div>
            </label>
            <label className="form-field">
              <span className="form-field-label">Paid by</span>
              <input
                ref={paidByInputRef}
                type="text"
                value={form.paid_by}
                onChange={(event) => setForm((f) => ({ ...f, paid_by: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Paid to</span>
              <input
                type="text"
                value={form.paid_to}
                onChange={(event) => setForm((f) => ({ ...f, paid_to: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Description (optional)</span>
              <textarea
                value={form.description ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              />
            </label>
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
              {viewingPayment.type === 'fuel' && (
                <div>
                  <dt>Linked fuel record</dt>
                  <dd>{fuelLabel(viewingPayment.associated_fuel)}</dd>
                </div>
              )}
              {viewingPayment.type === 'monthly_fair' && (
                <div>
                  <dt>Linked enrollment</dt>
                  <dd>{enrollmentLabel(viewingPayment.associated_enrollment)}</dd>
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
