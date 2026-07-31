import { useEffect, useMemo, useState } from 'react'
import { DashboardIcon } from '../components/NavIcons'
import ErrorDialog from '../components/ErrorDialog'
import { ApiError } from '../errors/api'
import * as api from '../api'
import type { Car } from '../types/car'
import type { Income } from '../types/income'
import type { Payment } from '../types/payment'
import type { RevenueSummary } from '../types/revenue'
import Loader from '../components/Loader'
import './DashboardPage.css'

const TYPE_ORDER = ['monthly_fair', 'service', 'document', 'other'] as const
const INCOME_TYPE = 'monthly_fair'

const typeLabels: Record<string, string> = {
  monthly_fair: 'Monthly fare',
  service: 'Service',
  document: 'Document',
  other: 'Other',
}

const typeColors: Record<string, string> = {
  monthly_fair: '#2a78d6',
  service: '#1baf7a',
  document: '#eda100',
  other: '#4a3aa7',
}

const INCOME_COLOR = '#2a78d6'
const EXPENSE_COLOR = '#eb6834'

function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, 'Something went wrong', 'Something went wrong')
}

function formatAmount(value: number | string) {
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPeriod(period: string) {
  const date = new Date(`${period}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) return period
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

interface DrillDownRow {
  key: string
  date: string
  car_id: string
  typeLabel: string
  signed: number
}

function DonutChart({ summary }: { summary: RevenueSummary }) {
  const size = 200
  const radius = 76
  const strokeWidth = 26
  const circumference = 2 * Math.PI * radius
  const gap = circumference * 0.015

  const segments = TYPE_ORDER.map((type) => ({
    type,
    amount: Number(summary.by_type.find((entry) => entry.type === type)?.amount ?? 0),
  })).filter((segment) => segment.amount > 0)

  const total = segments.reduce((sum, segment) => sum + segment.amount, 0)

  let cumulative = 0
  const arcs = segments.map((segment) => {
    const fraction = total > 0 ? segment.amount / total : 0
    const length = Math.max(fraction * circumference - gap, 0)
    const offset = cumulative
    cumulative += fraction * circumference
    return { ...segment, length, offset, fraction }
  })

  return (
    <div className="donut-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Payment breakdown by type"
      >
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          <circle r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
          {arcs.map((arc) => (
            <circle
              key={arc.type}
              r={radius}
              fill="none"
              stroke={typeColors[arc.type]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            >
              <title>
                {typeLabels[arc.type]}: {formatAmount(arc.amount)} ({(arc.fraction * 100).toFixed(1)}%)
              </title>
            </circle>
          ))}
        </g>
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" className="donut-total-label">
          Net
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" className="donut-total-value">
          {formatAmount(summary.net_revenue)}
        </text>
      </svg>
      <ul className="chart-legend">
        {segments.length === 0 && <li className="legend-empty">No payments in range</li>}
        {arcs.map((arc) => (
          <li key={arc.type}>
            <span className="legend-swatch" style={{ background: typeColors[arc.type] }} />
            <span className="legend-label">{typeLabels[arc.type]}</span>
            <span className="legend-value">{formatAmount(arc.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PeriodBarChart({ summary }: { summary: RevenueSummary }) {
  const periods = summary.by_period
  const chartHeight = 200
  const groupWidth = 64
  const barWidth = 20
  const maxValue = Math.max(1, ...periods.map((p) => Math.max(p.income, p.expense)))

  return (
    <div className="bar-chart-wrap">
      <ul className="chart-legend inline">
        <li>
          <span className="legend-swatch" style={{ background: INCOME_COLOR }} />
          <span className="legend-label">Income</span>
        </li>
        <li>
          <span className="legend-swatch" style={{ background: EXPENSE_COLOR }} />
          <span className="legend-label">Expense</span>
        </li>
      </ul>
      {periods.length === 0 ? (
        <p className="chart-empty">No payments in range</p>
      ) : (
        <div className="bar-chart-scroll">
          <svg
            width={periods.length * groupWidth}
            height={chartHeight + 32}
            role="img"
            aria-label="Income vs expense by month"
          >
            <line
              x1={0}
              y1={chartHeight}
              x2={periods.length * groupWidth}
              y2={chartHeight}
              stroke="var(--border)"
            />
            {periods.map((period, index) => {
              const groupX = index * groupWidth
              const incomeHeight = (period.income / maxValue) * (chartHeight - 12)
              const expenseHeight = (period.expense / maxValue) * (chartHeight - 12)
              return (
                <g key={period.period}>
                  <rect
                    x={groupX + groupWidth / 2 - barWidth - 3}
                    y={chartHeight - incomeHeight}
                    width={barWidth}
                    height={incomeHeight}
                    rx={3}
                    fill={INCOME_COLOR}
                  >
                    <title>
                      {formatPeriod(period.period)} income: {formatAmount(period.income)}
                    </title>
                  </rect>
                  <rect
                    x={groupX + groupWidth / 2 + 3}
                    y={chartHeight - expenseHeight}
                    width={barWidth}
                    height={expenseHeight}
                    rx={3}
                    fill={EXPENSE_COLOR}
                  >
                    <title>
                      {formatPeriod(period.period)} expense: {formatAmount(period.expense)}
                    </title>
                  </rect>
                  <text x={groupX + groupWidth / 2} y={chartHeight + 20} textAnchor="middle" className="bar-axis-label">
                    {formatPeriod(period.period)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

function DashboardPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [carId, setCarId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [incomeRecords, setIncomeRecords] = useState<Income[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const filteredMode = Boolean(carId || dateFrom || dateTo)

  useEffect(() => {
    api.listCars().catch(() => undefined).then((data) => data && setCars(data))
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    api
      .getRevenue({ carId: carId || undefined, from: dateFrom || undefined, to: dateTo || undefined })
      .then((data) => {
        if (!cancelled) setSummary(data)
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
  }, [carId, dateFrom, dateTo])

  useEffect(() => {
    if (!filteredMode) {
      setPayments([])
      setIncomeRecords([])
      return
    }
    let cancelled = false
    Promise.all([
      api.listPayments({
        carId: carId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: 'paid',
      }),
      api.listIncome({
        carId: carId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: 'paid',
      }),
    ])
      .catch(() => undefined)
      .then((result) => {
        if (cancelled || !result) return
        const [paymentsData, incomeData] = result
        setPayments(paymentsData)
        setIncomeRecords(incomeData)
      })
    return () => {
      cancelled = true
    }
  }, [carId, dateFrom, dateTo, filteredMode])

  const carLabel = useMemo(() => {
    const map = new Map(cars.map((car) => [car.id, car.registration_number ?? '—']))
    return (id: string) => map.get(id) ?? '—'
  }, [cars])

  const drillDownRows = useMemo<DrillDownRow[]>(() => {
    const paymentRows = payments.map((payment) => ({
      key: payment.id,
      date: payment.payment_date,
      car_id: payment.car_id,
      typeLabel: typeLabels[payment.type] ?? payment.type,
      signed: -Number(payment.amount),
    }))
    const incomeRows = incomeRecords.map((income) => ({
      key: income.id,
      date: income.payment_date,
      car_id: income.car_id,
      typeLabel: typeLabels[INCOME_TYPE],
      signed: Number(income.amount),
    }))
    return [...paymentRows, ...incomeRows].sort((a, b) => a.date.localeCompare(b.date))
  }, [payments, incomeRecords])

  const paymentsNet = useMemo(
    () => drillDownRows.reduce((sum, row) => sum + row.signed, 0),
    [drillDownRows],
  )

  return (
    <main id="content" className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="app-nav-icon">
            <DashboardIcon />
          </span>
          Dashboard
        </h1>
        <div className="revenue-filters">
          <select aria-label="Filter by car" value={carId} onChange={(event) => setCarId(event.target.value)}>
            <option value="">All cars</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.registration_number ?? '—'}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
      </div>

      {isLoading || !summary ? (
        <Loader />
      ) : (
        <>
          <div className="stat-tiles">
            <div className="card stat-tile">
              <span className="stat-label">Total income</span>
              <span className="stat-value income">{formatAmount(summary.total_income)}</span>
            </div>
            <div className="card stat-tile">
              <span className="stat-label">Total expense</span>
              <span className="stat-value expense">{formatAmount(summary.total_expense)}</span>
            </div>
            <div className="card stat-tile">
              <span className="stat-label">Net revenue</span>
              <span className={`stat-value ${summary.net_revenue >= 0 ? 'good' : 'critical'}`}>
                {formatAmount(summary.net_revenue)}
              </span>
            </div>
          </div>

          <div className="chart-row">
            <div className="card chart-card">
              <h2>Payments by type</h2>
              <DonutChart summary={summary} />
            </div>
            <div className="card chart-card chart-card-wide">
              <h2>Income vs expense by month</h2>
              <PeriodBarChart summary={summary} />
            </div>
          </div>

          {filteredMode ? (
            <div className="data-table-wrap card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SL</th>
                    <th>Date</th>
                    <th>Car</th>
                    <th>Payment type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {drillDownRows.length === 0 && (
                    <tr>
                      <td colSpan={5}>No payments in range</td>
                    </tr>
                  )}
                  {drillDownRows.map((row, index) => (
                    <tr key={row.key}>
                      <td>{index + 1}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{carLabel(row.car_id)}</td>
                      <td>{row.typeLabel}</td>
                      <td className={row.signed >= 0 ? 'good' : 'critical'}>
                        {row.signed >= 0 ? '+' : '-'}
                        {formatAmount(Math.abs(row.signed))}
                      </td>
                    </tr>
                  ))}
                  <tr className="net-row">
                    <td colSpan={4} className="net-row-label">
                      Net
                    </td>
                    <td className={paymentsNet >= 0 ? 'good' : 'critical'}>
                      {paymentsNet >= 0 ? '+' : '-'}
                      {formatAmount(Math.abs(paymentsNet))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            summary.by_car &&
            summary.by_car.length > 0 && (
              <div className="data-table-wrap card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SL</th>
                      <th>Car</th>
                      <th>Income</th>
                      <th>Expense</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.by_car.map((row, index) => (
                      <tr key={row.car_id}>
                        <td>{index + 1}</td>
                        <td>{carLabel(row.car_id)}</td>
                        <td>{formatAmount(row.income)}</td>
                        <td>{formatAmount(row.expense)}</td>
                        <td className={row.net >= 0 ? 'good' : 'critical'}>{formatAmount(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      <ErrorDialog error={error} onClose={() => setError(null)} />
    </main>
  )
}

export default DashboardPage
