import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CarDocsIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import { DOC_TYPES, type CarDoc, type CarDocInput } from '../types/carDoc'
import type { Car } from '../types/car'
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

function CarDocsPage() {
  const [docs, setDocs] = useState<CarDoc[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CarDocInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<CarDoc | null>(null)
  const docTypeSelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([api.listCarDocs(), api.listCars()])
      .then(([docsData, carsData]) => {
        if (cancelled) return
        setDocs(docsData)
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

  async function handleDelete(doc: CarDoc) {
    if (!window.confirm(`Delete this ${docLabel(doc)} doc?`)) return
    try {
      await api.deleteCarDoc(doc.id)
      setDocs((prev) => prev.filter((existing) => existing.id !== doc.id))
    } catch (err) {
      setError(toApiError(err))
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
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add doc
        </button>
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
            <select
              ref={docTypeSelectRef}
              aria-label="Doc type"
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
            <div className="field-with-hint">
              <input
                type="date"
                aria-label="Expiry date"
                value={form.expiry_date}
                onChange={(event) => setForm((f) => ({ ...f, expiry_date: event.target.value }))}
                required
              />
              <span className="field-hint">Expiry date — format YYYY-MM-DD</span>
            </div>
            <div className="field-with-hint">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Cost (e.g. 1500.00)"
                aria-label="Cost"
                value={form.cost === 0 ? '' : form.cost}
                onChange={(event) =>
                  setForm((f) => ({ ...f, cost: event.target.value === '' ? 0 : Number(event.target.value) }))
                }
                required
              />
              <span className="field-hint">Cost to renew/obtain this document</span>
            </div>
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
        <p>Loading…</p>
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
                      onClick={() => handleDelete(doc)}
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

export default CarDocsPage
