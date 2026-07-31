import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CarsIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { Car, CarInput } from '../types/car'
import type { CarOwner } from '../types/carOwner'
import type { Vendor } from '../types/vendor'
import type { Driver } from '../types/driver'
import type { Lease } from '../types/lease'
import './CarsPage.css'

const currentYear = new Date().getFullYear()

const emptyForm: CarInput = {
  brand: '',
  model_name: '',
  model_year: currentYear,
  registration_number: '',
  engine_number: '',
  chassis_number: '',
  tyre_size: '',
  owner_id: '',
  driver_id: '',
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function CarsPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [owners, setOwners] = useState<CarOwner[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [activeLeases, setActiveLeases] = useState<Lease[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CarInput>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingCar, setViewingCar] = useState<Car | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Car | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const brandInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      api.listCars(),
      api.listCarOwners(),
      api.listVendors(),
      api.listDrivers(),
      api.listLeases({ active: true }),
    ])
      .then(([carsData, ownersData, vendorsData, driversData, leasesData]) => {
        if (cancelled) return
        setCars(carsData)
        setOwners(ownersData)
        setVendors(vendorsData)
        setDrivers(driversData)
        setActiveLeases(leasesData)
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

  function ownerName(ownerId: string) {
    return owners.find((owner) => owner.id === ownerId)?.name ?? '—'
  }

  function vendorName(carId: string) {
    const lease = activeLeases.find((l) => l.car_id === carId)
    if (!lease) return '—'
    return vendors.find((vendor) => vendor.id === lease.vendor_id)?.name ?? '—'
  }

  function driverName(driverId: string | null) {
    if (!driverId) return '—'
    return drivers.find((driver) => driver.id === driverId)?.name ?? '—'
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEditForm(car: Car) {
    setViewingCar(null)
    setEditingId(car.id)
    setForm({
      brand: car.brand,
      model_name: car.model_name ?? '',
      model_year: car.model_year,
      registration_number: car.registration_number ?? '',
      engine_number: car.engine_number,
      chassis_number: car.chassis_number,
      tyre_size: car.tyre_size,
      owner_id: car.owner_id,
      driver_id: car.driver_id ?? '',
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
    brandInputRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeForm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFormOpen])

  useEffect(() => {
    if (!viewingCar) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingCar(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingCar])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const payload: CarInput = {
      ...form,
      model_name: form.model_name || null,
      registration_number: form.registration_number || null,
      driver_id: form.driver_id || null,
    }
    try {
      if (editingId) {
        const updated = await api.updateCar(editingId, payload)
        setCars((prev) => prev.map((car) => (car.id === editingId ? updated : car)))
      } else {
        const created = await api.createCar(payload)
        setCars((prev) => [...prev, created])
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
      await api.deleteCar(pendingDelete.id)
      setCars((prev) => prev.filter((existing) => existing.id !== pendingDelete.id))
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <main id="content" className="cars-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <CarsIcon />
          </span>
          Cars
        </h1>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          <PlusIcon />
          Add car
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="car-form-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 id="car-form-title">{editingId ? 'Edit car' : 'New car'}</h2>
            <label className="form-field">
              <span className="form-field-label">Brand</span>
              <input
                ref={brandInputRef}
                type="text"
                value={form.brand}
                onChange={(event) => setForm((f) => ({ ...f, brand: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Model (optional)</span>
              <input
                type="text"
                value={form.model_name ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, model_name: event.target.value }))}
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Model year</span>
              <input
                type="number"
                min="1980"
                max={currentYear + 1}
                value={form.model_year}
                onChange={(event) => setForm((f) => ({ ...f, model_year: Number(event.target.value) }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Registration number (optional)</span>
              <input
                type="text"
                value={form.registration_number ?? ''}
                onChange={(event) =>
                  setForm((f) => ({ ...f, registration_number: event.target.value }))
                }
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Engine number</span>
              <input
                type="text"
                value={form.engine_number}
                onChange={(event) => setForm((f) => ({ ...f, engine_number: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Chassis number</span>
              <input
                type="text"
                value={form.chassis_number}
                onChange={(event) => setForm((f) => ({ ...f, chassis_number: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Tyre size</span>
              <input
                type="text"
                value={form.tyre_size}
                onChange={(event) => setForm((f) => ({ ...f, tyre_size: event.target.value }))}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Owner</span>
              <select
                value={form.owner_id}
                onChange={(event) => setForm((f) => ({ ...f, owner_id: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select owner
                </option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field-label">Driver (optional)</span>
              <select
                value={form.driver_id ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, driver_id: event.target.value }))}
              >
                <option value="">Unassigned</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
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
          </form>
        </div>
      )}

      {viewingCar && (
        <div className="modal-backdrop" onClick={() => setViewingCar(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="car-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="car-view-title">
              {viewingCar.brand} {viewingCar.model_name ?? ''}
            </h2>
            <dl className="detail-list">
              <div>
                <dt>Brand</dt>
                <dd>{viewingCar.brand}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{viewingCar.model_name ?? '—'}</dd>
              </div>
              <div>
                <dt>Model year</dt>
                <dd>{viewingCar.model_year}</dd>
              </div>
              <div>
                <dt>Registration number</dt>
                <dd>{viewingCar.registration_number ?? '—'}</dd>
              </div>
              <div>
                <dt>Engine number</dt>
                <dd>{viewingCar.engine_number}</dd>
              </div>
              <div>
                <dt>Chassis number</dt>
                <dd>{viewingCar.chassis_number}</dd>
              </div>
              <div>
                <dt>Tyre size</dt>
                <dd>{viewingCar.tyre_size}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{ownerName(viewingCar.owner_id)}</dd>
              </div>
              <div>
                <dt>Vendor</dt>
                <dd>{vendorName(viewingCar.id)}</dd>
              </div>
              <div>
                <dt>Driver</dt>
                <dd>{driverName(viewingCar.driver_id)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(viewingCar.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(viewingCar.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingCar(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={() => openEditForm(viewingCar)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : cars.length === 0 ? (
        <p>No cars yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Brand &amp; model</th>
                <th>Year</th>
                <th>Registration no.</th>
                <th>Owner</th>
                <th>Vendor</th>
                <th>Driver</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car, index) => (
                <tr key={car.id}>
                  <td>{index + 1}</td>
                  <td>
                    {car.brand} {car.model_name ?? ''}
                  </td>
                  <td>{car.model_year}</td>
                  <td>{car.registration_number ?? '—'}</td>
                  <td>{ownerName(car.owner_id)}</td>
                  <td>{vendorName(car.id)}</td>
                  <td>{driverName(car.driver_id)}</td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`View ${car.brand}`}
                      title="View"
                      onClick={() => setViewingCar(car)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${car.brand}`}
                      title="Edit"
                      onClick={() => openEditForm(car)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${car.brand}`}
                      title="Delete"
                      onClick={() => setPendingDelete(car)}
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
        title={`Delete car "${pendingDelete ? `${pendingDelete.brand} ${pendingDelete.model_name ?? ''}`.trim() : ''}"?`}
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default CarsPage
