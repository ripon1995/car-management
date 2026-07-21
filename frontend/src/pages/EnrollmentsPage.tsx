import { useEffect, useRef, useState, type FormEvent } from 'react'
import { EnrollmentIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { Enrollment, EnrollmentInput, DuePayments } from '../types/enrollment'
import { carDisplayLabel, type Car } from '../types/car'
import type { Vendor } from '../types/vendor'
import './EnrollmentsPage.css'

const emptyForm: EnrollmentInput = {
  car_id: '',
  vendor_id: '',
  monthly_fare: 0,
  start_date: '',
  end_date: null,
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EnrollmentInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingEnrollment, setViewingEnrollment] = useState<Enrollment | null>(null)
  const [dueStatus, setDueStatus] = useState<DuePayments | null>(null)
  const [isDueLoading, setIsDueLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const carSelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([api.listEnrollments(), api.listCars(), api.listVendors()])
      .then(([enrollmentsData, carsData, vendorsData]) => {
        if (cancelled) return
        setEnrollments(enrollmentsData)
        setCars(carsData)
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
    return car ? carDisplayLabel(car) : '—'
  }

  function vendorLabel(vendorId: string) {
    return vendors.find((v) => v.id === vendorId)?.name ?? '—'
  }

  function recordLabel(enrollment: Enrollment) {
    return `${carLabel(enrollment.car_id)} — ${vendorLabel(enrollment.vendor_id)}`
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(enrollment: Enrollment) {
    setViewingEnrollment(null)
    setEditingId(enrollment.id)
    setForm({
      car_id: enrollment.car_id,
      vendor_id: enrollment.vendor_id,
      monthly_fare: enrollment.monthly_fare,
      start_date: enrollment.start_date,
      end_date: enrollment.end_date,
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
    if (!editingId) carSelectRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeForm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen, editingId])

  useEffect(() => {
    if (!viewingEnrollment) {
      setDueStatus(null)
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingEnrollment(null)
    }
    document.addEventListener('keydown', handleKeyDown)

    let cancelled = false
    setIsDueLoading(true)
    api
      .getDuePayments(viewingEnrollment.id)
      .then((data) => {
        if (!cancelled) setDueStatus(data)
      })
      .catch((err) => {
        if (!cancelled) setError(toApiError(err))
      })
      .finally(() => {
        if (!cancelled) setIsDueLoading(false)
      })

    return () => {
      cancelled = true
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewingEnrollment])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      if (editingId) {
        const updated = await api.updateEnrollment(editingId, {
          monthly_fare: form.monthly_fare,
          start_date: form.start_date,
          end_date: form.end_date || null,
        })
        setEnrollments((prev) => prev.map((e) => (e.id === editingId ? updated : e)))
      } else {
        const payload: EnrollmentInput = { ...form, end_date: form.end_date || null }
        const created = await api.createEnrollment(payload)
        setEnrollments((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(enrollment: Enrollment) {
    if (!window.confirm(`Delete enrollment "${recordLabel(enrollment)}"?`)) return
    try {
      await api.deleteEnrollment(enrollment.id)
      setEnrollments((prev) => prev.filter((existing) => existing.id !== enrollment.id))
    } catch (err) {
      setError(toApiError(err))
    }
  }

  async function handleGenerate() {
    if (!viewingEnrollment) return
    setIsGenerating(true)
    try {
      await api.generateDuePayments(viewingEnrollment.id)
      const refreshed = await api.getDuePayments(viewingEnrollment.id)
      setDueStatus(refreshed)
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main id="content" className="enrollments-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <EnrollmentIcon />
          </span>
          Enrollments
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add enrollment
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="enrollment-form-title">{editingId ? 'Edit enrollment' : 'New enrollment'}</h2>
            {editingId ? (
              <>
                <label className="form-field">
                  <span className="form-field-label">Car</span>
                  <span>{carLabel(form.car_id)}</span>
                </label>
                <label className="form-field">
                  <span className="form-field-label">Vendor</span>
                  <span>{vendorLabel(form.vendor_id)}</span>
                </label>
              </>
            ) : (
              <>
                <label className="form-field">
                  <span className="form-field-label">Car</span>
                  <select
                    ref={carSelectRef}
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
                <label className="form-field">
                  <span className="form-field-label">Vendor</span>
                  <select
                    value={form.vendor_id}
                    onChange={(event) => setForm((f) => ({ ...f, vendor_id: event.target.value }))}
                    required
                  >
                    <option value="" disabled>
                      Select vendor
                    </option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="form-field">
              <span className="form-field-label">Monthly fare</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 15000.00"
                value={form.monthly_fare === 0 ? '' : form.monthly_fare}
                onChange={(event) =>
                  setForm((f) => ({
                    ...f,
                    monthly_fare: event.target.value === '' ? 0 : Number(event.target.value),
                  }))
                }
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Start date</span>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => setForm((f) => ({ ...f, start_date: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">End date (optional)</span>
              <div className="field-with-hint">
                <input
                  type="date"
                  value={form.end_date ?? ''}
                  onChange={(event) => setForm((f) => ({ ...f, end_date: event.target.value || null }))}
                />
                <span className="field-hint">Leave empty while the car is still leased out</span>
              </div>
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

      {viewingEnrollment && (
        <div className="modal-backdrop" onClick={() => setViewingEnrollment(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="enrollment-view-title">{recordLabel(viewingEnrollment)}</h2>
            <dl className="detail-list">
              <div>
                <dt>Car</dt>
                <dd>{carLabel(viewingEnrollment.car_id)}</dd>
              </div>
              <div>
                <dt>Vendor</dt>
                <dd>{vendorLabel(viewingEnrollment.vendor_id)}</dd>
              </div>
              <div>
                <dt>Monthly fare</dt>
                <dd>{viewingEnrollment.monthly_fare}</dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{viewingEnrollment.start_date}</dd>
              </div>
              <div>
                <dt>End date</dt>
                <dd>{viewingEnrollment.end_date ?? '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className={viewingEnrollment.end_date ? '' : 'active'}>
                  {viewingEnrollment.end_date ? 'Ended' : 'Active'}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingEnrollment.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingEnrollment.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="payment-status">
              <h3>Payment status</h3>
              {isDueLoading ? (
                <p>Loading…</p>
              ) : dueStatus ? (
                <>
                  <p>
                    Generated: {dueStatus.generated_months.length > 0 ? dueStatus.generated_months.join(', ') : '—'}
                  </p>
                  <p>Due: {dueStatus.due_months.length > 0 ? dueStatus.due_months.join(', ') : 'None'}</p>
                  {dueStatus.due_months.length > 0 && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating…' : 'Generate due payments'}
                    </button>
                  )}
                </>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingEnrollment(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openEditForm(viewingEnrollment)}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : enrollments.length === 0 ? (
        <p>No enrollments yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Car</th>
                <th>Vendor</th>
                <th>Monthly fare</th>
                <th>Start date</th>
                <th>End date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment, index) => (
                <tr key={enrollment.id}>
                  <td>{index + 1}</td>
                  <td>{carLabel(enrollment.car_id)}</td>
                  <td>{vendorLabel(enrollment.vendor_id)}</td>
                  <td>{enrollment.monthly_fare}</td>
                  <td>{enrollment.start_date}</td>
                  <td>{enrollment.end_date ?? '—'}</td>
                  <td className={enrollment.end_date ? '' : 'active'}>
                    {enrollment.end_date ? 'Ended' : 'Active'}
                  </td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${recordLabel(enrollment)}`}
                      title="View"
                      onClick={() => setViewingEnrollment(enrollment)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${recordLabel(enrollment)}`}
                      title="Edit"
                      onClick={() => openEditForm(enrollment)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${recordLabel(enrollment)}`}
                      title="Delete"
                      onClick={() => handleDelete(enrollment)}
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

export default EnrollmentsPage
