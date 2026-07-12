import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CarOwnersIcon, PlusIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { CarOwner, CarOwnerInput } from '../types/carOwner'
import './CarOwnersPage.css'

const emptyForm: CarOwnerInput = { name: '', phone_number: '' }

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function CarOwnersPage() {
  const [owners, setOwners] = useState<CarOwner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CarOwnerInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    api
      .listCarOwners()
      .then((data) => {
        if (!cancelled) setOwners(data)
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

  function openEditForm(owner: CarOwner) {
    setEditingId(owner.id)
    setForm({ name: owner.name, phone_number: owner.phone_number })
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      if (editingId) {
        const updated = await api.updateCarOwner(editingId, form)
        setOwners((prev) => prev.map((owner) => (owner.id === editingId ? updated : owner)))
      } else {
        const created = await api.createCarOwner(form)
        setOwners((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(owner: CarOwner) {
    if (!window.confirm(`Delete car owner "${owner.name}"?`)) return
    try {
      await api.deleteCarOwner(owner.id)
      setOwners((prev) => prev.filter((existing) => existing.id !== owner.id))
    } catch (err) {
      setError(toApiError(err))
    }
  }

  return (
    <main id="content" className="car-owners-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <CarOwnersIcon />
          </span>
          Car Owners
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add owner
        </button>
      </div>

      {isFormOpen && (
        <div className="car-owner-modal-backdrop" onClick={closeForm}>
          <form
            className="car-owner-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="car-owner-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="car-owner-form-title">{editingId ? 'Edit car owner' : 'New car owner'}</h2>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Name"
              aria-label="Name"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              required
            />
            <input
              type="tel"
              placeholder="Phone number"
              aria-label="Phone number"
              value={form.phone_number}
              onChange={(event) => setForm((f) => ({ ...f, phone_number: event.target.value }))}
              required
            />
            <div className="car-owner-form-actions">
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

      {isLoading ? (
        <p>Loading…</p>
      ) : owners.length === 0 ? (
        <p>No car owners yet.</p>
      ) : (
        <div className="car-owners-table-wrap card">
          <table className="car-owners-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone number</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner.id}>
                  <td>{owner.name}</td>
                  <td>{owner.phone_number}</td>
                  <td className="car-owners-table-actions">
                    <button type="button" className="link" onClick={() => openEditForm(owner)}>
                      Edit
                    </button>
                    <button type="button" className="link danger" onClick={() => handleDelete(owner)}>
                      Delete
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

export default CarOwnersPage
