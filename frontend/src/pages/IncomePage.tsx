import { useEffect, useMemo, useState } from 'react'
import { IncomeIcon, CheckIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
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
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)

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
      if (newPayment) setMarkPaidPayment(newPayment)
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setGeneratingKey(null)
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
        description: markPaidPayment.description,
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
                    <td className="data-table-actions">
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <MarkPaidDialog
        open={markPaidPayment !== null}
        payment={markPaidPayment}
        carLabel={markPaidPayment ? carLabel(markPaidPayment.car_id) : ''}
        typeLabel="Monthly fare"
        isSaving={isMarkingPaid}
        onSave={confirmMarkPaid}
        onCancel={() => setMarkPaidPayment(null)}
      />

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default IncomePage
