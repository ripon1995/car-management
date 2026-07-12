import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DriversIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { Driver, DriverInput } from '../types/driver'
import './DriversPage.css'

const emptyForm: DriverInput = {
  name: '',
  address: '',
  contact_number: '',
  whatsapp_number: '',
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DriverInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    api
      .listDrivers()
      .then((data) => {
        if (!cancelled) setDrivers(data)
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

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(driver: Driver) {
    setViewingDriver(null)
    setEditingId(driver.id)
    setForm({
      name: driver.name,
      address: driver.address,
      contact_number: driver.contact_number,
      whatsapp_number: driver.whatsapp_number ?? '',
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
    if (!viewingDriver) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingDriver(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingDriver])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const payload: DriverInput = {
      ...form,
      whatsapp_number: form.whatsapp_number || null,
    }
    try {
      if (editingId) {
        const updated = await api.updateDriver(editingId, payload)
        setDrivers((prev) => prev.map((driver) => (driver.id === editingId ? updated : driver)))
      } else {
        const created = await api.createDriver(payload)
        setDrivers((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(driver: Driver) {
    if (!window.confirm(`Delete driver "${driver.name}"?`)) return
    try {
      await api.deleteDriver(driver.id)
      setDrivers((prev) => prev.filter((existing) => existing.id !== driver.id))
    } catch (err) {
      setError(toApiError(err))
    }
  }

  return (
    <main id="content" className="drivers-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <DriversIcon />
          </span>
          Drivers
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add driver
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="driver-form-title">{editingId ? 'Edit driver' : 'New driver'}</h2>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Name"
              aria-label="Name"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              required
            />
            <textarea
              placeholder="Address"
              aria-label="Address"
              value={form.address}
              onChange={(event) => setForm((f) => ({ ...f, address: event.target.value }))}
              required
            />
            <input
              type="tel"
              placeholder="Contact number"
              aria-label="Contact number"
              value={form.contact_number}
              onChange={(event) => setForm((f) => ({ ...f, contact_number: event.target.value }))}
              required
            />
            <input
              type="tel"
              placeholder="WhatsApp number (optional)"
              aria-label="WhatsApp number"
              value={form.whatsapp_number ?? ''}
              onChange={(event) => setForm((f) => ({ ...f, whatsapp_number: event.target.value }))}
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

      {viewingDriver && (
        <div className="modal-backdrop" onClick={() => setViewingDriver(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="driver-view-title">{viewingDriver.name}</h2>
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewingDriver.name}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{viewingDriver.address}</dd>
              </div>
              <div>
                <dt>Contact number</dt>
                <dd>{viewingDriver.contact_number}</dd>
              </div>
              <div>
                <dt>WhatsApp number</dt>
                <dd>{viewingDriver.whatsapp_number ?? '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingDriver.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingDriver.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingDriver(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => openEditForm(viewingDriver)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : drivers.length === 0 ? (
        <p>No drivers yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Name</th>
                <th>Contact number</th>
                <th>WhatsApp number</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, index) => (
                <tr key={driver.id}>
                  <td>{index + 1}</td>
                  <td>{driver.name}</td>
                  <td>{driver.contact_number}</td>
                  <td>{driver.whatsapp_number ?? '—'}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${driver.name}`}
                      title="View"
                      onClick={() => setViewingDriver(driver)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${driver.name}`}
                      title="Edit"
                      onClick={() => openEditForm(driver)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${driver.name}`}
                      title="Delete"
                      onClick={() => handleDelete(driver)}
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

export default DriversPage
