import { useEffect, useMemo, useState } from 'react'
import { IncomeIcon, CheckIcon, ViewIcon, EditIcon, DeleteIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { DuePayments, Lease } from '../types/lease'
import type { Payment } from '../types/payment'
import { carDisplayLabel, type Car } from '../types/car'
import type { Vendor } from '../types/vendor'
import Loader from '../components/Loader'
import MarkPaidDialog, { type MarkPaidUpdates } from '../components/MarkPaidDialog'
import './IncomePage.css'

interface IncomeRow {
  key: string
  lease: Lease
  month: string
  payment: Payment | null
}

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function IncomePage() {
  const [leases, setLeases] = useState<Lease[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [dueByLease, setDueByLease] = useState<Map<string, DuePayments>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [generatingKey, setGeneratingKey] = useState<string | null>(null)
  const [markPaidPayment, setMarkPaidPayment] = useState<Payment | null>(null)
  const [dialogTitle, setDialogTitle] = useState('Mark as received')
  const [isSimpleDialog, setIsSimpleDialog] = useState(true)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [viewingRow, setViewingRow] = useState<IncomeRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function loadDueStatus(leaseList: Lease[]) {
    const entries = await Promise.all(
      leaseList.map((lease) => api.getDuePayments(lease.id).then((data) => [lease.id, data] as const)),
    )
    setDueByLease(new Map(entries))
  }

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([api.listLeases(), api.listCars(), api.listVendors(), api.listPayments({ type: 'monthly_fair' })])
      .then(async ([leasesData, carsData, vendorsData, paymentsData]) => {
        if (cancelled) return
        setLeases(leasesData)
        setCars(carsData)
        setVendors(vendorsData)
        setPayments(paymentsData)
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

  const rows = useMemo<IncomeRow[]>(() => {
    const result: IncomeRow[] = []
    for (const lease of leases) {
      const due = dueByLease.get(lease.id)
      if (!due) continue
      const months = [...new Set([...due.generated_months, ...due.due_months])].sort()
      for (const month of months) {
        const payment =
          payments.find(
            (p) => p.associated_lease === lease.id && p.payment_date.slice(0, 7) === month,
          ) ?? null
        result.push({ key: `${lease.id}:${month}`, lease, month, payment })
      }
    }
    return result.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
  }, [leases, dueByLease, payments])

  async function handleMarkPaidClick(row: IncomeRow) {
    if (row.payment) {
      setDialogTitle('Mark as received')
      setIsSimpleDialog(true)
      setMarkPaidPayment(row.payment)
      return
    }
    setGeneratingKey(row.key)
    try {
      await api.generateDuePayments(row.lease.id)
      const [refreshedDue, refreshedPayments] = await Promise.all([
        api.getDuePayments(row.lease.id),
        api.listPayments({ type: 'monthly_fair' }),
      ])
      setDueByLease((prev) => new Map(prev).set(row.lease.id, refreshedDue))
      setPayments(refreshedPayments)
      const newPayment = refreshedPayments.find(
        (p) => p.associated_lease === row.lease.id && p.payment_date.slice(0, 7) === row.month,
      )
      if (newPayment) {
        setDialogTitle('Mark as received')
        setIsSimpleDialog(true)
        setMarkPaidPayment(newPayment)
      }
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setGeneratingKey(null)
    }
  }

  function openEditDialog(payment: Payment) {
    setDialogTitle('Edit payment')
    setIsSimpleDialog(false)
    setMarkPaidPayment(payment)
  }

  async function confirmDeletePayment() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await api.deletePayment(pendingDelete.id)
      setPayments((prev) => prev.filter((payment) => payment.id !== pendingDelete.id))
      const leaseId = pendingDelete.associated_lease
      if (leaseId) {
        const refreshedDue = await api.getDuePayments(leaseId)
        setDueByLease((prev) => new Map(prev).set(leaseId, refreshedDue))
      }
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setIsDeleting(false)
      setPendingDelete(null)
    }
  }

  async function confirmMarkPaid(updates: MarkPaidUpdates) {
    if (!markPaidPayment) return
    setIsMarkingPaid(true)
    try {
      const payload = {
        type: markPaidPayment.type,
        associated_maintenance: markPaidPayment.associated_maintenance,
        associated_cardocs: markPaidPayment.associated_cardocs,
        associated_fuel: markPaidPayment.associated_fuel,
        associated_lease: markPaidPayment.associated_lease,
        car_id: markPaidPayment.car_id,
        amount: markPaidPayment.amount,
        ...updates,
      }
      const updated = await api.updatePayment(markPaidPayment.id, payload)
      setPayments((prev) => prev.map((payment) => (payment.id === updated.id ? updated : payment)))
      setMarkPaidPayment(null)
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
      </div>

      {isLoading ? (
        <Loader />
      ) : rows.length === 0 ? (
        <p>No lease income to show yet.</p>
      ) : (
        <div className="data-table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Car</th>
                <th>Vendor</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="mark-received-col">Mark received</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isPaid = row.payment?.status === 'paid'
                return (
                  <tr key={row.key}>
                    <td>{index + 1}</td>
                    <td>{carLabel(row.lease.car_id)}</td>
                    <td>{vendorLabel(row.lease.vendor_id)}</td>
                    <td>{row.month}</td>
                    <td>{row.payment?.amount ?? row.lease.monthly_fare}</td>
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
                        {row.payment && (
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
                        {row.payment && (
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Edit payment"
                            title="Edit"
                            onClick={() => openEditDialog(row.payment as Payment)}
                          >
                            <EditIcon />
                          </button>
                        )}
                        {row.payment && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            aria-label="Delete payment"
                            title="Delete"
                            onClick={() => setPendingDelete(row.payment)}
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
              {carLabel(viewingRow.lease.car_id)} — {viewingRow.month}
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
                <dd>{viewingRow.month}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{viewingRow.payment?.amount ?? viewingRow.lease.monthly_fare}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`status-badge ${viewingRow.payment?.status === 'paid' ? 'paid' : 'unpaid'}`}>
                    {viewingRow.payment?.status === 'paid' ? 'Received' : 'Not received'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Payment date</dt>
                <dd>{viewingRow.payment?.payment_date ?? '—'}</dd>
              </div>
              <div>
                <dt>Paid by</dt>
                <dd>{viewingRow.payment?.paid_by || '—'}</dd>
              </div>
              <div>
                <dt>Paid to</dt>
                <dd>{viewingRow.payment?.paid_to || '—'}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{viewingRow.payment?.description ?? '—'}</dd>
              </div>
              {viewingRow.payment && (
                <>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(viewingRow.payment.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Last updated</dt>
                    <dd>{new Date(viewingRow.payment.updated_at).toLocaleString()}</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setViewingRow(null)}>
                Close
              </button>
              {viewingRow.payment && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (viewingRow.payment) openEditDialog(viewingRow.payment)
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
        open={markPaidPayment !== null}
        payment={markPaidPayment}
        carLabel={markPaidPayment ? carLabel(markPaidPayment.car_id) : ''}
        typeLabel="Monthly fare"
        title={dialogTitle}
        simple={isSimpleDialog}
        isSaving={isMarkingPaid}
        onSave={confirmMarkPaid}
        onCancel={() => setMarkPaidPayment(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this monthly fare payment?"
        isConfirming={isDeleting}
        onConfirm={confirmDeletePayment}
        onCancel={() => setPendingDelete(null)}
      />

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default IncomePage
