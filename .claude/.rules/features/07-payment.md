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
| associated_fuel        | uuid (FK)     | no       | → `fuel_records.id`, set when `type = fuel` — **(added)** in migration `0012`, after the [Fuel](../../../CLAUDE.md) feature was added post-launch |
| associated_enrollment  | uuid (FK)     | **conditional** | → `enrollments.id` — **required** when `type = monthly_fair`, rejected for every other type — **(added)** in migration `0016`, after the Enrollment feature (see `CLAUDE.md`) replaced `vendors.monthly_fare`/`cars.vendor_id`; tightened from optional to required after launch (user's explicit call) |
| car_id                 | uuid (FK)     | yes      | → `cars.id` — **(added)** not in the original field list; needed so `monthly_fair`/`other` payments (which have no associated_maintenance/associated_cardocs to derive a car from) can still be attributed to a car for the Revenue dashboard |
| amount                 | numeric(12,2) | yes      | **(added)** not in the original field list; required for Revenue math to work regardless of type. For `type = monthly_fair` it is **not** taken from the request — the backend always overwrites it with the linked Enrollment's `monthly_fare`, so the UI doesn't ask for it at all (see Business Rules). For every other type it's still entered directly on the payment. |
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
- `associated_fuel` → optionally links to the Fuel record that generated
  this payment (`type = fuel`).
- `associated_enrollment` → links to the Enrollment (dated car↔vendor
  lease) that generated this payment. Unlike the other three
  `associated_*` fields, this one is **mandatory** for its matching type —
  every `monthly_fair` payment must trace back to a real Enrollment, there
  is no "ad-hoc monthly fare" path anymore. These can also be created in
  bulk via `POST /api/v1/enrollments/{id}/generate-payments`, which fills
  in a `monthly_fair` Payment for every month the enrollment was active
  and doesn't have one yet — still a manually-triggered action, not a
  scheduler.

## API Endpoints
- `GET /api/v1/payments` — list, filter by `car_id`, `type`, date range;
  paginated.
- `POST /api/v1/payments`
- `GET /api/v1/payments/{id}`
- `PUT /api/v1/payments/{id}`
- `DELETE /api/v1/payments/{id}`

## Business Rules & Validation
- `amount` must be >= 0 — but this is only user-validated for
  `service`/`document`/`fuel`/`other`. For `type = monthly_fair`, whatever
  `amount` is submitted (including none) is ignored: the backend always
  overwrites it with the linked Enrollment's `monthly_fare` before saving,
  so it can never drift from the enrollment's actual rate. Sign is not
  stored either way — whether a payment adds to or subtracts from Revenue
  is derived from `type` (see Revenue calculation).
- `associated_maintenance` should only be set when `type = service`;
  `associated_cardocs` should only be set when `type = document`;
  `associated_fuel` should only be set when `type = fuel`;
  `associated_enrollment` should only be set when `type = monthly_fair` —
  **and must be set** whenever `type = monthly_fair` (rejected as missing
  otherwise).
- `associated_maintenance`, `associated_cardocs`, and `associated_fuel`
  stay optional even for their matching type, since a payment may exist
  without a formal linked record (e.g. ad-hoc expense). `associated_enrollment`
  is the one exception — it's mandatory for `monthly_fair`, since a payment
  of that type isn't meaningful without an amount to derive, and the
  amount is only knowable via the linked Enrollment.
