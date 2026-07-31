import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FuelIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import { FUEL_TYPES, type FuelRecord, type FuelInput } from '../types/fuel'
import { carDisplayLabel, type Car } from '../types/car'
import Loader from '../components/Loader'
import './FuelPage.css'

const typeLabels: Record<string, string> = {
  octane: 'Octane',
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  other: 'Other',
}

const emptyForm: FuelInput = {
  fuel_type: 'octane',
  quantity_liters: 0,
  cost: 0,
  odometer_reading: null,
  fuel_station: '',
  fuel_date: '',
  description: '',
  car_id: '',
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function monthToDateRange(month: string): { dateFrom: string; dateTo: string } {
  const [year, mon] = month.split('-').map(Number)
  const lastDay = new Date(year, mon, 0).getDate()
  return { dateFrom: `${month}-01`, dateTo: `${month}-${String(lastDay).padStart(2, '0')}` }
}

function FuelPage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [filterCarId, setFilterCarId] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FuelInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<FuelRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<FuelRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const typeSelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    api
      .listCars()
      .catch(() => undefined)
      .then((data) => data && setCars(data))
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const { dateFrom, dateTo } = filterMonth ? monthToDateRange(filterMonth) : { dateFrom: undefined, dateTo: undefined }
    api
      .listFuelRecords({ carId: filterCarId || undefined, dateFrom, dateTo })
      .then((data) => {
        if (!cancelled) setRecords(data)
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
  }, [filterCarId, filterMonth])

  function carLabel(carId: string) {
    const car = cars.find((c) => c.id === carId)
    if (!car) return '—'
    return carDisplayLabel(car)
  }

  function recordLabel(record: FuelRecord) {
    return `${typeLabels[record.fuel_type]} — ${carLabel(record.car_id)}`
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(record: FuelRecord) {
    setViewingRecord(null)
    setEditingId(record.id)
    setForm({
      fuel_type: record.fuel_type,
      quantity_liters: record.quantity_liters,
      cost: record.cost,
      odometer_reading: record.odometer_reading,
      fuel_station: record.fuel_station,
      fuel_date: record.fuel_date,
      description: record.description ?? '',
      car_id: record.car_id,
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
    typeSelectRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeForm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen])

  useEffect(() => {
    if (!viewingRecord) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingRecord(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingRecord])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const payload: FuelInput = {
      ...form,
      odometer_reading: form.odometer_reading || null,
      description: form.description || null,
    }
    try {
      if (editingId) {
        const updated = await api.updateFuelRecord(editingId, payload)
        setRecords((prev) => prev.map((record) => (record.id === editingId ? updated : record)))
      } else {
        const created = await api.createFuelRecord(payload)
        setRecords((prev) => [...prev, created])
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
      await api.deleteFuelRecord(pendingDelete.id)
      setRecords((prev) => prev.filter((existing) => existing.id !== pendingDelete.id))
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <main id="content" className="fuel-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <FuelIcon />
          </span>
          Fuel
        </h1>
        <div className="page-actions">
          <div className="list-filters">
            <select
              aria-label="Filter by registration number"
              value={filterCarId}
              onChange={(event) => setFilterCarId(event.target.value)}
            >
              <option value="">All registrations</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.registration_number ?? carDisplayLabel(car)}
                </option>
              ))}
            </select>
            <input
              type="month"
              aria-label="Filter by month"
              value={filterMonth}
              onChange={(event) => setFilterMonth(event.target.value)}
            />
          </div>
          <button type="button" className="btn-primary" onClick={openCreateForm}>
            <PlusIcon />
            Add record
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fuel-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="fuel-form-title">{editingId ? 'Edit record' : 'New record'}</h2>
            <label className="form-field">
              <span className="form-field-label">Fuel type</span>
              <select
                ref={typeSelectRef}
                value={form.fuel_type}
                onChange={(event) =>
                  setForm((f) => ({ ...f, fuel_type: event.target.value as FuelInput['fuel_type'] }))
                }
                required
              >
                {FUEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field-label">Quantity (liters)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.quantity_liters === 0 ? '' : form.quantity_liters}
                onChange={(event) =>
                  setForm((f) => ({
                    ...f,
                    quantity_liters: event.target.value === '' ? 0 : Number(event.target.value),
                  }))
                }
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Cost</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1500.00"
                value={form.cost === 0 ? '' : form.cost}
                onChange={(event) =>
                  setForm((f) => ({ ...f, cost: event.target.value === '' ? 0 : Number(event.target.value) }))
                }
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Odometer reading (optional)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.odometer_reading ?? ''}
                onChange={(event) =>
                  setForm((f) => ({
                    ...f,
                    odometer_reading: event.target.value === '' ? null : Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Fuel station</span>
              <input
                type="text"
                value={form.fuel_station}
                onChange={(event) => setForm((f) => ({ ...f, fuel_station: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Fuel date</span>
              <input
                type="date"
                value={form.fuel_date}
                onChange={(event) => setForm((f) => ({ ...f, fuel_date: event.target.value }))}
                required
              />
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
            {isSubmitting && (
              <div className="modal-panel-overlay">
                <Loader label="Saving…" />
              </div>
            )}
          </form>
        </div>
      )}

      {viewingRecord && (
        <div className="modal-backdrop" onClick={() => setViewingRecord(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fuel-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="fuel-view-title">{recordLabel(viewingRecord)}</h2>
            <dl className="detail-list">
              <div>
                <dt>Fuel type</dt>
                <dd>{typeLabels[viewingRecord.fuel_type]}</dd>
              </div>
              <div>
                <dt>Quantity (liters)</dt>
                <dd>{viewingRecord.quantity_liters}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{viewingRecord.cost}</dd>
              </div>
              <div>
                <dt>Odometer reading</dt>
                <dd>{viewingRecord.odometer_reading ?? '—'}</dd>
              </div>
              <div>
                <dt>Fuel station</dt>
                <dd>{viewingRecord.fuel_station}</dd>
              </div>
              <div>
                <dt>Fuel date</dt>
                <dd>{viewingRecord.fuel_date}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{viewingRecord.description ?? '—'}</dd>
              </div>
              <div>
                <dt>Car</dt>
                <dd>{carLabel(viewingRecord.car_id)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingRecord.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingRecord.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingRecord(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => openEditForm(viewingRecord)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : records.length === 0 ? (
        <p>No fuel records yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Fuel type</th>
                <th>Quantity (L)</th>
                <th>Cost</th>
                <th>Fuel station</th>
                <th>Fuel date</th>
                <th>Car</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td>{typeLabels[record.fuel_type]}</td>
                  <td>{record.quantity_liters}</td>
                  <td>{record.cost}</td>
                  <td>{record.fuel_station}</td>
                  <td>{record.fuel_date}</td>
                  <td>{carLabel(record.car_id)}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${recordLabel(record)}`}
                      title="View"
                      onClick={() => setViewingRecord(record)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${recordLabel(record)}`}
                      title="Edit"
                      onClick={() => openEditForm(record)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${recordLabel(record)}`}
                      title="Delete"
                      onClick={() => setPendingDelete(record)}
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
        title={`Delete this ${pendingDelete ? recordLabel(pendingDelete) : ''} fuel record?`}
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default FuelPage
