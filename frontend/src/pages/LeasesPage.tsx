import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LeaseIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { Lease, LeaseInput } from '../types/lease'
import { carDisplayLabel, type Car } from '../types/car'
import type { Vendor } from '../types/vendor'
import Loader from '../components/Loader'
import './LeasesPage.css'

const emptyForm: LeaseInput = {
  car_id: '',
  vendor_id: '',
  monthly_fare: 0,
  start_date: '',
  end_date: null,
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LeaseInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingLease, setViewingLease] = useState<Lease | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Lease | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const carSelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([api.listLeases(), api.listCars(), api.listVendors()])
      .then(([leasesData, carsData, vendorsData]) => {
        if (cancelled) return
        setLeases(leasesData)
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

  function recordLabel(lease: Lease) {
    return `${carLabel(lease.car_id)} — ${vendorLabel(lease.vendor_id)}`
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(lease: Lease) {
    setViewingLease(null)
    setEditingId(lease.id)
    setForm({
      car_id: lease.car_id,
      vendor_id: lease.vendor_id,
      monthly_fare: lease.monthly_fare,
      start_date: lease.start_date,
      end_date: lease.end_date,
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
    if (!viewingLease) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingLease(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingLease])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      if (editingId) {
        const updated = await api.updateLease(editingId, {
          monthly_fare: form.monthly_fare,
          start_date: form.start_date,
          end_date: form.end_date || null,
        })
        setLeases((prev) => prev.map((l) => (l.id === editingId ? updated : l)))
      } else {
        const payload: LeaseInput = { ...form, end_date: form.end_date || null }
        const created = await api.createLease(payload)
        setLeases((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await api.deleteLease(pendingDelete.id)
      setLeases((prev) => prev.filter((existing) => existing.id !== pendingDelete.id))
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <main id="content" className="leases-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <LeaseIcon />
          </span>
          Leases
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add lease
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lease-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="lease-form-title">{editingId ? 'Edit lease' : 'New lease'}</h2>
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

      {viewingLease && (
        <div className="modal-backdrop" onClick={() => setViewingLease(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lease-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="lease-view-title">{recordLabel(viewingLease)}</h2>
            <dl className="detail-list">
              <div>
                <dt>Car</dt>
                <dd>{carLabel(viewingLease.car_id)}</dd>
              </div>
              <div>
                <dt>Vendor</dt>
                <dd>{vendorLabel(viewingLease.vendor_id)}</dd>
              </div>
              <div>
                <dt>Monthly fare</dt>
                <dd>{viewingLease.monthly_fare}</dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{viewingLease.start_date}</dd>
              </div>
              <div>
                <dt>End date</dt>
                <dd>{viewingLease.end_date ?? '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className={viewingLease.end_date ? '' : 'active'}>
                  {viewingLease.end_date ? 'Ended' : 'Active'}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingLease.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingLease.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingLease(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openEditForm(viewingLease)}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : leases.length === 0 ? (
        <p>No leases yet.</p>
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
              {leases.map((lease, index) => (
                <tr key={lease.id}>
                  <td>{index + 1}</td>
                  <td>{carLabel(lease.car_id)}</td>
                  <td>{vendorLabel(lease.vendor_id)}</td>
                  <td>{lease.monthly_fare}</td>
                  <td>{lease.start_date}</td>
                  <td>{lease.end_date ?? '—'}</td>
                  <td className={lease.end_date ? '' : 'active'}>
                    {lease.end_date ? 'Ended' : 'Active'}
                  </td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${recordLabel(lease)}`}
                      title="View"
                      onClick={() => setViewingLease(lease)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${recordLabel(lease)}`}
                      title="Edit"
                      onClick={() => openEditForm(lease)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${recordLabel(lease)}`}
                      title="Delete"
                      onClick={() => setPendingDelete(lease)}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete lease "${pendingDelete ? recordLabel(pendingDelete) : ''}"?`}
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default LeasesPage
