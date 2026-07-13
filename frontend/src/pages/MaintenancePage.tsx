import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MaintenanceIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import { MAINTENANCE_TYPES, type MaintenanceRecord, type MaintenanceInput } from '../types/maintenance'
import type { Car } from '../types/car'
import './MaintenancePage.css'

const typeLabels: Record<string, string> = {
  service: 'Service',
  battery: 'Battery',
  tyre: 'Tyre',
  spare_parts: 'Spare parts',
  engine_oil: 'Engine oil',
}

const emptyForm: MaintenanceInput = {
  name: '',
  type: 'service',
  cost: 0,
  service_place: '',
  service_by: '',
  car_id: '',
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MaintenanceInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([api.listMaintenance(), api.listCars()])
      .then(([recordsData, carsData]) => {
        if (cancelled) return
        setRecords(recordsData)
        setCars(carsData)
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

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(record: MaintenanceRecord) {
    setViewingRecord(null)
    setEditingId(record.id)
    setForm({
      name: record.name,
      type: record.type,
      cost: record.cost,
      service_place: record.service_place,
      service_by: record.service_by,
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
    nameInputRef.current?.focus()

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
    try {
      if (editingId) {
        const updated = await api.updateMaintenance(editingId, form)
        setRecords((prev) => prev.map((record) => (record.id === editingId ? updated : record)))
      } else {
        const created = await api.createMaintenance(form)
        setRecords((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(record: MaintenanceRecord) {
    if (!window.confirm(`Delete maintenance record "${record.name}"?`)) return
    try {
      await api.deleteMaintenance(record.id)
      setRecords((prev) => prev.filter((existing) => existing.id !== record.id))
    } catch (err) {
      setError(toApiError(err))
    }
  }

  return (
    <main id="content" className="maintenance-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <MaintenanceIcon />
          </span>
          Maintenance
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add record
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="maintenance-form-title">{editingId ? 'Edit record' : 'New record'}</h2>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Name"
              aria-label="Name"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              required
            />
            <select
              aria-label="Type"
              value={form.type}
              onChange={(event) =>
                setForm((f) => ({ ...f, type: event.target.value as MaintenanceInput['type'] }))
              }
              required
            >
              {MAINTENANCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cost"
              aria-label="Cost"
              value={form.cost}
              onChange={(event) => setForm((f) => ({ ...f, cost: Number(event.target.value) }))}
              required
            />
            <input
              type="text"
              placeholder="Service place"
              aria-label="Service place"
              value={form.service_place}
              onChange={(event) => setForm((f) => ({ ...f, service_place: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Service by"
              aria-label="Service by"
              value={form.service_by}
              onChange={(event) => setForm((f) => ({ ...f, service_by: event.target.value }))}
              required
            />
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

      {viewingRecord && (
        <div className="modal-backdrop" onClick={() => setViewingRecord(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="maintenance-view-title">{viewingRecord.name}</h2>
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewingRecord.name}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{typeLabels[viewingRecord.type]}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{viewingRecord.cost}</dd>
              </div>
              <div>
                <dt>Service place</dt>
                <dd>{viewingRecord.service_place}</dd>
              </div>
              <div>
                <dt>Service by</dt>
                <dd>{viewingRecord.service_by}</dd>
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
        <p>Loading…</p>
      ) : records.length === 0 ? (
        <p>No maintenance records yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Name</th>
                <th>Type</th>
                <th>Cost</th>
                <th>Service place</th>
                <th>Service by</th>
                <th>Car</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td>{record.name}</td>
                  <td>{typeLabels[record.type]}</td>
                  <td>{record.cost}</td>
                  <td>{record.service_place}</td>
                  <td>{record.service_by}</td>
                  <td>{carLabel(record.car_id)}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${record.name}`}
                      title="View"
                      onClick={() => setViewingRecord(record)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${record.name}`}
                      title="Edit"
                      onClick={() => openEditForm(record)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${record.name}`}
                      title="Delete"
                      onClick={() => handleDelete(record)}
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

export default MaintenancePage
