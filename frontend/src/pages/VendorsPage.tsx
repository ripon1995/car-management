import { useEffect, useRef, useState, type FormEvent } from 'react'
import { VendorsIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { Vendor, VendorInput } from '../types/vendor'
import './VendorsPage.css'

const emptyForm: VendorInput = {
  name: '',
  address: '',
  contact_number: '',
  whatsapp_number: '',
  monthly_fare: 0,
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VendorInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    api
      .listVendors()
      .then((data) => {
        if (!cancelled) setVendors(data)
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

  function openEditForm(vendor: Vendor) {
    setViewingVendor(null)
    setEditingId(vendor.id)
    setForm({
      name: vendor.name,
      address: vendor.address,
      contact_number: vendor.contact_number,
      whatsapp_number: vendor.whatsapp_number ?? '',
      monthly_fare: vendor.monthly_fare,
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
    if (!viewingVendor) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingVendor(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingVendor])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const payload: VendorInput = {
      ...form,
      whatsapp_number: form.whatsapp_number || null,
    }
    try {
      if (editingId) {
        const updated = await api.updateVendor(editingId, payload)
        setVendors((prev) => prev.map((vendor) => (vendor.id === editingId ? updated : vendor)))
      } else {
        const created = await api.createVendor(payload)
        setVendors((prev) => [...prev, created])
      }
      closeForm()
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(vendor: Vendor) {
    if (!window.confirm(`Delete vendor "${vendor.name}"?`)) return
    try {
      await api.deleteVendor(vendor.id)
      setVendors((prev) => prev.filter((existing) => existing.id !== vendor.id))
    } catch (err) {
      setError(toApiError(err))
    }
  }

  return (
    <main id="content" className="vendors-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <VendorsIcon />
          </span>
          Vendors
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add vendor
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="vendor-form-title">{editingId ? 'Edit vendor' : 'New vendor'}</h2>
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
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Monthly fare"
              aria-label="Monthly fare"
              value={form.monthly_fare}
              onChange={(event) =>
                setForm((f) => ({ ...f, monthly_fare: Number(event.target.value) }))
              }
              required
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

      {viewingVendor && (
        <div className="modal-backdrop" onClick={() => setViewingVendor(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="vendor-view-title">{viewingVendor.name}</h2>
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewingVendor.name}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{viewingVendor.address}</dd>
              </div>
              <div>
                <dt>Contact number</dt>
                <dd>{viewingVendor.contact_number}</dd>
              </div>
              <div>
                <dt>WhatsApp number</dt>
                <dd>{viewingVendor.whatsapp_number ?? '—'}</dd>
              </div>
              <div>
                <dt>Monthly fare</dt>
                <dd>{viewingVendor.monthly_fare}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingVendor.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingVendor.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingVendor(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => openEditForm(viewingVendor)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : vendors.length === 0 ? (
        <p>No vendors yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Name</th>
                <th>Contact number</th>
                <th>WhatsApp number</th>
                <th>Monthly fare</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor, index) => (
                <tr key={vendor.id}>
                  <td>{index + 1}</td>
                  <td>{vendor.name}</td>
                  <td>{vendor.contact_number}</td>
                  <td>{vendor.whatsapp_number ?? '—'}</td>
                  <td>{vendor.monthly_fare}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${vendor.name}`}
                      title="View"
                      onClick={() => setViewingVendor(vendor)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${vendor.name}`}
                      title="Edit"
                      onClick={() => openEditForm(vendor)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${vendor.name}`}
                      title="Delete"
                      onClick={() => handleDelete(vendor)}
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

export default VendorsPage
