# Feature: Payment CRUD

## Overview
Ledger of individual money movements tied to a car. Only `monthly_fair`
payments count as income (added to Revenue); every other type
(`service`, `document`, `other`) is deducted from Revenue. This is the
source data the [Revenue](08-revenue.md) dashboard aggregates.

## Data Model — `payments`
| Field                  | Type          | Required | Notes |
|------------------------|---------------|----------|-------|
| id                     | uuid (PK)     | yes      | |
| type                   | varchar       | yes      | enum: `service`, `document`, `monthly_fair`, `other` |
| associated_maintenance | uuid (FK)     | no       | → `maintenance_records.id`, set when `type = service` |
| associated_cardocs     | uuid (FK)     | no       | → `car_docs.id`, set when `type = document` |
| car_id                 | uuid (FK)     | yes      | → `cars.id` — **(added)** not in the original field list; needed so `monthly_fair`/`other` payments (which have no associated_maintenance/associated_cardocs to derive a car from) can still be attributed to a car for the Revenue dashboard |
| amount                 | numeric(12,2) | yes      | **(added)** not in the original field list; entered directly on the payment regardless of type — required for Revenue math to work, including `type = other` which has no linked record to pull a cost from |
| payment_date           | date          | yes      | **(added)** not in the original field list; required to group Revenue's bar chart by period (e.g. month) |
| paid_by                | varchar       | yes      | free text — e.g. vendor/owner name |
| paid_to                | varchar       | yes      | free text — e.g. mechanic/vendor/owner name |
| description            | text          | no       | |
| created_at             | timestamptz   | yes      | |
| updated_at             | timestamptz   | yes      | |

## Relationships
- `car_id` → one Car has many Payments.
- `associated_maintenance` → optionally links to the Maintenance record
  that generated this payment (`type = service`).
- `associated_cardocs` → optionally links to the Car Doc record that
  generated this payment (`type = document`).

## API Endpoints
- `GET /api/v1/payments` — list, filter by `car_id`, `type`, date range;
  paginated.
- `POST /api/v1/payments`
- `GET /api/v1/payments/{id}`
- `PUT /api/v1/payments/{id}`
- `DELETE /api/v1/payments/{id}`

## Business Rules & Validation
- `amount` must be >= 0. Sign is not stored — whether a payment adds to or
  subtracts from Revenue is derived from `type` (see Revenue calculation).
- `associated_maintenance` should only be set when `type = service`;
  `associated_cardocs` should only be set when `type = document`.
- Both `associated_maintenance` and `associated_cardocs` are optional even
  for their matching type, since a payment may exist without a formal
  Maintenance/CarDocs record (e.g. ad-hoc expense).
