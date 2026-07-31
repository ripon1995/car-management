import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CarDocsIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import { DOC_TYPES, type CarDoc, type CarDocInput } from '../types/carDoc'
import { carDisplayLabel, type Car } from '../types/car'
import Loader from '../components/Loader'
import './CarDocsPage.css'

const todayIso = new Date().toISOString().slice(0, 10)

const docTypeLabels: Record<string, string> = {
  tax_token: 'Tax token',
  fitness: 'Fitness',
  route_permit: 'Route permit',
  registration_certificate: 'Registration certificate',
}

const emptyForm: CarDocInput = {
  doc_type: 'registration_certificate',
  expiry_date: '',
  cost: 0,
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

function CarDocsPage() {
  const [docs, setDocs] = useState<CarDoc[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [filterCarId, setFilterCarId] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CarDocInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<CarDoc | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CarDoc | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const docTypeSelectRef = useRef<HTMLSelectElement>(null)

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
      .listCarDocs({ carId: filterCarId || undefined, dateFrom, dateTo })
      .then((data) => {
        if (!cancelled) setDocs(data)
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

  function docLabel(doc: CarDoc) {
    return `${docTypeLabels[doc.doc_type]} — ${carLabel(doc.car_id)}`
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(doc: CarDoc) {
    setViewingDoc(null)
    setEditingId(doc.id)
    setForm({
      doc_type: doc.doc_type,
      expiry_date: doc.expiry_date,
      cost: doc.cost,
      car_id: doc.car_id,
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
    docTypeSelectRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeForm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen])

  useEffect(() => {
    if (!viewingDoc) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingDoc(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingDoc])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      if (editingId) {
        const updated = await api.updateCarDoc(editingId, form)
        setDocs((prev) => prev.map((doc) => (doc.id === editingId ? updated : doc)))
      } else {
        const created = await api.createCarDoc(form)
        setDocs((prev) => [...prev, created])
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
      await api.deleteCarDoc(pendingDelete.id)
      setDocs((prev) => prev.filter((existing) => existing.id !== pendingDelete.id))
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <main id="content" className="car-docs-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <CarDocsIcon />
          </span>
          Car Docs
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
              aria-label="Filter by expiry month"
              value={filterMonth}
              onChange={(event) => setFilterMonth(event.target.value)}
            />
          </div>
          <button type="button" className="btn-primary" onClick={openCreateForm}>
            <PlusIcon />
            Add doc
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="car-doc-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="car-doc-form-title">{editingId ? 'Edit car doc' : 'New car doc'}</h2>
            <label className="form-field">
              <span className="form-field-label">Doc type</span>
              <select
                ref={docTypeSelectRef}
                value={form.doc_type}
                onChange={(event) =>
                  setForm((f) => ({ ...f, doc_type: event.target.value as CarDocInput['doc_type'] }))
                }
                required
              >
                {DOC_TYPES.map((docType) => (
                  <option key={docType} value={docType}>
                    {docTypeLabels[docType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field-label">Expiry date</span>
              <div className="field-with-hint">
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(event) => setForm((f) => ({ ...f, expiry_date: event.target.value }))}
                  required
                />
                <span className="field-hint">Format YYYY-MM-DD</span>
              </div>
            </label>
            <label className="form-field">
              <span className="form-field-label">Cost</span>
              <div className="field-with-hint">
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
                <span className="field-hint">Cost to renew/obtain this document</span>
              </div>
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

      {viewingDoc && (
        <div className="modal-backdrop" onClick={() => setViewingDoc(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="car-doc-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="car-doc-view-title">{docLabel(viewingDoc)}</h2>
            <dl className="detail-list">
              <div>
                <dt>Doc type</dt>
                <dd>{docTypeLabels[viewingDoc.doc_type]}</dd>
              </div>
              <div>
                <dt>Expiry date</dt>
                <dd>{viewingDoc.expiry_date}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{viewingDoc.cost}</dd>
              </div>
              <div>
                <dt>Car</dt>
                <dd>{carLabel(viewingDoc.car_id)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingDoc.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingDoc.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingDoc(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => openEditForm(viewingDoc)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : docs.length === 0 ? (
        <p>No car docs yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Doc type</th>
                <th>Expiry date</th>
                <th>Cost</th>
                <th>Car</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, index) => (
                <tr key={doc.id}>
                  <td>{index + 1}</td>
                  <td>{docTypeLabels[doc.doc_type]}</td>
                  <td className={doc.expiry_date < todayIso ? 'expired' : undefined}>
                    {doc.expiry_date}
                  </td>
                  <td>{doc.cost}</td>
                  <td>{carLabel(doc.car_id)}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${docLabel(doc)}`}
                      title="View"
                      onClick={() => setViewingDoc(doc)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${docLabel(doc)}`}
                      title="Edit"
                      onClick={() => openEditForm(doc)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${docLabel(doc)}`}
                      title="Delete"
                      onClick={() => setPendingDelete(doc)}
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
        title={`Delete this ${pendingDelete ? docLabel(pendingDelete) : ''} doc?`}
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default CarDocsPage
