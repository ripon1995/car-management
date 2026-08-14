import { useEffect, useMemo, useState } from 'react'
import { IncomeIcon, CheckIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { DuePayments, Lease } from '../types/lease'
import type { Income, IncomeInput } from '../types/income'
import { carDisplayLabel, type Car } from '../types/car'
import type { CarOwner } from '../types/carOwner'
import type { Vendor } from '../types/vendor'
import Loader from '../components/Loader'
import MarkPaidDialog, { type MarkPaidUpdates } from '../components/MarkPaidDialog'
import './IncomePage.css'

interface IncomeRow {
  key: string
  lease: Lease
  month: string
  income: Income | null
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function IncomePage() {
  const [leases, setLeases] = useState<Lease[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [carOwners, setCarOwners] = useState<CarOwner[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [incomeRecords, setIncomeRecords] = useState<Income[]>([])
  const [dueByLease, setDueByLease] = useState<Map<string, DuePayments>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [generatingKey, setGeneratingKey] = useState<string | null>(null)
  const [markPaidIncome, setMarkPaidIncome] = useState<Income | null>(null)
  const [dialogTitle, setDialogTitle] = useState('Mark as received')
  const [isSimpleDialog, setIsSimpleDialog] = useState(true)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [viewingRow, setViewingRow] = useState<IncomeRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Income | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filterCarId, setFilterCarId] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  async function loadDueStatus(leaseList: Lease[]) {
    const entries = await Promise.all(
      leaseList.map((lease) => api.getDuePayments(lease.id).then((data) => [lease.id, data] as const)),
    )
    setDueByLease(new Map(entries))
  }

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([api.listLeases(), api.listCars(), api.listCarOwners(), api.listVendors(), api.listIncome()])
      .then(async ([leasesData, carsData, carOwnersData, vendorsData, incomeData]) => {
        if (cancelled) return
        setLeases(leasesData)
        setCars(carsData)
        setCarOwners(carOwnersData)
        setVendors(vendorsData)
        setIncomeRecords(incomeData)
        await loadDueStatus(leasesData)
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

  useEffect(() => {
    if (!viewingRow) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingRow(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewingRow])

  function carLabel(carId: string) {
    const car = cars.find((c) => c.id === carId)
    return car ? carDisplayLabel(car) : '—'
  }

  function vendorLabel(vendorId: string) {
    return vendors.find((v) => v.id === vendorId)?.name ?? '—'
  }

  function ownerLabel(carId: string) {
    const car = cars.find((c) => c.id === carId)
    if (!car) return '—'
    return carOwners.find((o) => o.id === car.owner_id)?.name ?? '—'
  }

  function monthLabel(month: string) {
    const [year, monthNum] = month.split('-')
    const date = new Date(Number(year), Number(monthNum) - 1, 1)
    const formatted = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return formatted.replace(' ', '-')
  }

  const rows = useMemo<IncomeRow[]>(() => {
    const result: IncomeRow[] = []
    for (const lease of leases) {
      const due = dueByLease.get(lease.id)
      if (!due) continue
      const months = [...new Set([...due.generated_months, ...due.due_months])].sort()
      for (const month of months) {
        const income =
          incomeRecords.find(
            (i) => i.lease_id === lease.id && i.period.slice(0, 7) === month,
          ) ?? null
        result.push({ key: `${lease.id}:${month}`, lease, month, income })
      }
    }
    return result.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
  }, [leases, dueByLease, incomeRecords])

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!filterCarId || row.lease.car_id === filterCarId) && (!filterMonth || row.month === filterMonth),
      ),
    [rows, filterCarId, filterMonth],
  )

  async function handleMarkPaidClick(row: IncomeRow) {
    if (row.income) {
      setDialogTitle('Mark as received')
      setIsSimpleDialog(true)
      setMarkPaidIncome(row.income)
      return
    }
    setGeneratingKey(row.key)
    try {
      await api.generateDuePayments(row.lease.id)
      const [refreshedDue, refreshedIncome] = await Promise.all([
        api.getDuePayments(row.lease.id),
        api.listIncome(),
      ])
      setDueByLease((prev) => new Map(prev).set(row.lease.id, refreshedDue))
      setIncomeRecords(refreshedIncome)
      const newIncome = refreshedIncome.find(
        (i) => i.lease_id === row.lease.id && i.period.slice(0, 7) === row.month,
      )
      if (newIncome) {
        setDialogTitle('Mark as received')
        setIsSimpleDialog(true)
        setMarkPaidIncome(newIncome)
      }
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setGeneratingKey(null)
    }
  }

  function openEditDialog(income: Income) {
    setDialogTitle('Edit payment')
    setIsSimpleDialog(false)
    setMarkPaidIncome(income)
  }

  async function confirmDeleteIncome() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await api.deleteIncome(pendingDelete.id)
      setIncomeRecords((prev) => prev.filter((income) => income.id !== pendingDelete.id))
      const refreshedDue = await api.getDuePayments(pendingDelete.lease_id)
      setDueByLease((prev) => new Map(prev).set(pendingDelete.lease_id, refreshedDue))
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsDeleting(false)
      setPendingDelete(null)
    }
  }

  async function confirmMarkPaid(updates: MarkPaidUpdates) {
    if (!markPaidIncome) return
    setIsMarkingPaid(true)
    try {
      const payload: IncomeInput = {
        lease_id: markPaidIncome.lease_id,
        ...updates,
      }
      const updated = await api.updateIncome(markPaidIncome.id, payload)
      setIncomeRecords((prev) => prev.map((income) => (income.id === updated.id ? updated : income)))
      setMarkPaidIncome(null)
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsMarkingPaid(false)
    }
  }

  return (
    <main id="content" className="income-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <IncomeIcon />
          </span>
          Income
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
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : filteredRows.length === 0 ? (
        <p>No lease income to show yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Car</th>
                <th>Owner</th>
                <th>Vendor</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="mark-received-col">Mark received</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const isPaid = row.income?.status === 'paid'
                return (
                  <tr key={row.key}>
                    <td>{index + 1}</td>
                    <td>{carLabel(row.lease.car_id)}</td>
                    <td>{ownerLabel(row.lease.car_id)}</td>
                    <td>{vendorLabel(row.lease.vendor_id)}</td>
                    <td>{monthLabel(row.month)}</td>
                    <td>{row.income?.amount ?? row.lease.monthly_fare}</td>
                    <td>
                      <span className={`status-badge ${isPaid ? 'paid' : 'unpaid'}`}>
                        {isPaid ? 'Received' : 'Not received'}
                      </span>
                    </td>
                    <td>
                      <div className="data-table-actions mark-received-col">
                        {!isPaid && (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Mark as received"
                            title="Mark as received"
                            onClick={() => handleMarkPaidClick(row)}
                            disabled={generatingKey === row.key}
                          >
                            <CheckIcon />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="data-table-actions">
                        {row.income && (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="View payment"
                            title="View"
                            onClick={() => setViewingRow(row)}
                          >
                            <ViewIcon />
                          </button>
                        )}
                        {row.income && (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Edit payment"
                            title="Edit"
                            onClick={() => openEditDialog(row.income as Income)}
                          >
                            <EditIcon />
                          </button>
                        )}
                        {row.income && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            aria-label="Delete payment"
                            title="Delete"
                            onClick={() => setPendingDelete(row.income)}
                          >
                            <DeleteIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewingRow && (
        <div className="modal-backdrop" onClick={() => setViewingRow(null)}>
          <div
            className="modal-panel card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="income-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="income-view-title">
              {carLabel(viewingRow.lease.car_id)} — {monthLabel(viewingRow.month)}
            </h2>
            <dl className="detail-list">
              <div>
                <dt>Car</dt>
                <dd>{carLabel(viewingRow.lease.car_id)}</dd>
              </div>
              <div>
                <dt>Vendor</dt>
                <dd>{vendorLabel(viewingRow.lease.vendor_id)}</dd>
              </div>
              <div>
                <dt>Month</dt>
                <dd>{monthLabel(viewingRow.month)}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{viewingRow.income?.amount ?? viewingRow.lease.monthly_fare}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`status-badge ${viewingRow.income?.status === 'paid' ? 'paid' : 'unpaid'}`}>
                    {viewingRow.income?.status === 'paid' ? 'Received' : 'Not received'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Payment date</dt>
                <dd>{viewingRow.income?.payment_date ?? '—'}</dd>
              </div>
              <div>
                <dt>Paid by</dt>
                <dd>{viewingRow.income?.paid_by || '—'}</dd>
              </div>
              <div>
                <dt>Paid to</dt>
                <dd>{viewingRow.income?.paid_to || '—'}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{viewingRow.income?.description ?? '—'}</dd>
              </div>
              {viewingRow.income && (
                <>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(viewingRow.income.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{new Date(viewingRow.income.updated_at).toLocaleString()}</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingRow(null)}>
                Close
              </button>
              {viewingRow.income && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (viewingRow.income) openEditDialog(viewingRow.income)
                    setViewingRow(null)
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <MarkPaidDialog
        open={markPaidIncome !== null}
        payment={markPaidIncome}
        carLabel={markPaidIncome ? carLabel(markPaidIncome.car_id) : ''}
        typeLabel="Monthly fare"
        title={dialogTitle}
        simple={isSimpleDialog}
        paidByAsText
        isSaving={isMarkingPaid}
        onSave={confirmMarkPaid}
        onCancel={() => setMarkPaidIncome(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this monthly fare payment?"
        isConfirming={isDeleting}
        onConfirm={confirmDeleteIncome}
        onCancel={() => setPendingDelete(null)}
      />

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default IncomePage
