import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CarDocsIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { CarDoc, CarDocInput } from '../types/carDoc'
import type { Car } from '../types/car'
import './CarDocsPage.css'

const todayIso = new Date().toISOString().slice(0, 10)

const emptyForm: CarDocInput = {
  name: '',
  expiry_date: todayIso,
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
  const nameInputRef = useRef<HTMLInputElement>(null)

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

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(doc: CarDoc) {
    setViewingDoc(null)
    setEditingId(doc.id)
    setForm({
      name: doc.name,
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
    nameInputRef.current?.focus()

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
    if (!window.confirm(`Delete car doc "${doc.name}"?`)) return
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
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Name (e.g. Registration, Insurance)"
              aria-label="Name"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              required
            />
            <input
              type="date"
              aria-label="Expiry date"
              value={form.expiry_date}
              onChange={(event) => setForm((f) => ({ ...f, expiry_date: event.target.value }))}
              required
            />
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
            <h2 id="car-doc-view-title">{viewingDoc.name}</h2>
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewingDoc.name}</dd>
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
                <th>Name</th>
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
                  <td>{doc.name}</td>
                  <td className={doc.expiry_date < todayIso ? 'expired' : undefined}>
                    {doc.expiry_date}
                  </td>
                  <td>{doc.cost}</td>
                  <td>{carLabel(doc.car_id)}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${doc.name}`}
                      title="View"
                      onClick={() => setViewingDoc(doc)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${doc.name}`}
                      title="Edit"
                      onClick={() => openEditForm(doc)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${doc.name}`}
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
