# Feature: Revenue (Dashboard only — no model/table)

## Overview
Revenue is **not** a CRUD resource and has no database table. It's a
read-only dashboard, computed entirely from [Payment](07-payment.md)
records, shown as pie and bar charts.

## Calculation
```
revenue = sum(payments.amount where type = 'monthly_fair' and status = 'paid')
        - sum(payments.amount where type in ('service', 'document', 'fuel', 'other') and status = 'paid')
```
- `type = monthly_fair` → added to revenue (income).
- `type = service | document | fuel | other` → deducted from revenue (expense).
- **Cash-basis, not accrual** (added 2026-08-01, see `docs/decisions.md`):
  only `status = 'paid'` payments are included at all — an `unpaid`
  payment (e.g. a freshly auto-created Maintenance/Fuel/Car Doc/Lease
  stub, see [Payment](07-payment.md)) does not affect any total until it's
  marked paid.

## API Endpoints
- `GET /api/v1/revenue` — aggregated report, computed on the fly from
  `payments`.
  - Query params: `car_id` (optional filter), `from`, `to` (date range).
  - Response: total income, total expense, net revenue, plus breakdowns
    for charting:
    - by `type` (for the pie chart — share of `monthly_fair` vs `service`
      vs `document` vs `other`)
    - by period, e.g. month (for the bar chart — net revenue over time),
      grouped using `payments.payment_date`
    - optionally by `car_id` when no single car is filtered, to compare
      cars.

## Business Rules & Validation
- No writes — this endpoint is purely a query/aggregation over `payments`.
- Since it's dashboard-only, response shape should be driven by whatever
  the frontend charting library needs (e.g. array of `{label, value}` for
  the pie chart, array of `{period, income, expense, net}` for the bar
  chart) — finalize the exact shape when building the frontend chart
  components.
