# Feature: Payment CRUD

## Overview
Ledger of individual money movements tied to a car. Only `monthly_fair`
payments count as income (added to Revenue); every other type
(`service`, `document`, `other`) is deducted from Revenue. This is the
source data the [Revenue](08-revenue.md) dashboard aggregates — and only
`status = "paid"` payments are included in that aggregation (see Business
Rules).

**Reversed 2026-08-01** (see `docs/decisions.md`): `service`/`document`/
`fuel` payments are no longer created by hand on the Payments page — they
are auto-created (as `status = "unpaid"`) whenever a Maintenance, Car Doc,
or Fuel record is created, by the Maintenance/Car Docs/Fuel features
directly (bypassing this feature's own create endpoint/validation). The
Payments page's manual "create" flow is `other`-only on the frontend now;
the backend endpoint still accepts every `type` for API completeness.

## Data Model — `payments`
| Field                  | Type          | Required | Notes |
|------------------------|---------------|----------|-------|
| id                     | uuid (PK)     | yes      | |
| type                   | varchar       | yes      | enum: `service`, `document`, `monthly_fair`, `other` |
| associated_maintenance | uuid (FK)     | no       | → `maintenance_records.id`, set when `type = service` |
| associated_cardocs     | uuid (FK)     | no       | → `car_docs.id`, set when `type = document` |
| associated_fuel        | uuid (FK)     | no       | → `fuel_records.id`, set when `type = fuel` — **(added)** in migration `0012`, after the [Fuel](../../../CLAUDE.md) feature was added post-launch |
| associated_lease       | uuid (FK)     | **conditional** | → `leases.id` — **required** when `type = monthly_fair`, rejected for every other type — **(added)** in migration `0016` (as `associated_enrollment`, renamed by `0017` — see `CLAUDE.md`), after the Lease feature replaced `vendors.monthly_fare`/`cars.vendor_id`; tightened from optional to required after launch (user's explicit call) |
| car_id                 | uuid (FK)     | yes      | → `cars.id` — **(added)** not in the original field list; needed so `monthly_fair`/`other` payments (which have no associated_maintenance/associated_cardocs to derive a car from) can still be attributed to a car for the Revenue dashboard |
| amount                 | numeric(12,2) | yes      | **(added)** not in the original field list; required for Revenue math to work regardless of type. For `type = monthly_fair` it is **not** taken from the request — the backend always overwrites it with the linked Lease's `monthly_fare`, so the UI doesn't ask for it at all (see Business Rules). For every other type it's still entered directly on the payment. |
| payment_date           | date          | yes      | **(added)** not in the original field list; required to group Revenue's bar chart by period (e.g. month) |
| paid_by                | varchar       | yes      | enum `EBL`/`DBBL`/`UCB`/`CASH` (**added** 2026-08-01) when `type != monthly_fair`; free text (the vendor's name) when `type = monthly_fair`. Auto-created payments (see below) start as an empty string until filled in when the payment is marked paid |
| paid_to                | varchar       | yes      | free text — e.g. mechanic/vendor/owner name. Same empty-string-until-marked-paid behavior as `paid_by` for auto-created payments |
| status                 | varchar       | yes      | **(added)** 2026-08-01, migration `0018`; enum `paid`/`unpaid`. Defaults to `paid` (DB `server_default` + `PaymentCreate` default) — manually-created payments and all pre-existing rows represent already-settled money. Auto-created payments (from Maintenance/Car Docs/Fuel, and Lease's bulk `generate-payments`) are created with `status="unpaid"` explicitly, bypassing this default |
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
- `associated_lease` → links to the Lease (dated car↔vendor
  lease) that generated this payment. Unlike the other three
  `associated_*` fields, this one is **mandatory** for its matching type —
  every `monthly_fair` payment must trace back to a real Lease, there
  is no "ad-hoc monthly fare" path anymore. These can also be created in
  bulk via `POST /api/v1/leases/{id}/generate-payments`, which fills
  in a `monthly_fair` Payment for every month the lease was active
  and doesn't have one yet — still a manually-triggered action, not a
  scheduler.

## API Endpoints
- `GET /api/v1/payments` — list, filter by `car_id`, `type`, `status`,
  date range; paginated.
- `POST /api/v1/payments`
- `GET /api/v1/payments/{id}`
- `PUT /api/v1/payments/{id}` — how a payment is marked paid: `PUT` with
  `status: "paid"` plus real `paid_by`/`paid_to`/`payment_date`.
- `DELETE /api/v1/payments/{id}`

## Business Rules & Validation
- `amount` must be >= 0 — but this is only user-validated for
  `service`/`document`/`fuel`/`other`. For `type = monthly_fair`, whatever
  `amount` is submitted (including none) is ignored: the backend always
  overwrites it with the linked Lease's `monthly_fare` before saving,
  so it can never drift from the lease's actual rate. Sign is not
  stored either way — whether a payment adds to or subtracts from Revenue
  is derived from `type` (see Revenue calculation).
- `associated_maintenance` should only be set when `type = service`;
  `associated_cardocs` should only be set when `type = document`;
  `associated_fuel` should only be set when `type = fuel`;
  `associated_lease` should only be set when `type = monthly_fair` —
  **and must be set** whenever `type = monthly_fair` (rejected as missing
  otherwise).
- `associated_maintenance`, `associated_cardocs`, and `associated_fuel`
  stay optional even for their matching type, since a payment may exist
  without a formal linked record (e.g. ad-hoc expense). `associated_lease`
  is the one exception — it's mandatory for `monthly_fair`, since a payment
  of that type isn't meaningful without an amount to derive, and the
  amount is only knowable via the linked Lease.
- `status` must be one of `paid`/`unpaid` (`ValidationException`
  otherwise, same shape as the `type` check).
- `paid_by` must be one of `EBL`/`DBBL`/`UCB`/`CASH` whenever
  `type != monthly_fair` (`ValidationException` otherwise); no constraint
  when `type = monthly_fair`, since it holds the vendor's name there, not
  a payment method. Checked on `create()` and on `update()` whenever
  `type` or `paid_by` changes.
- **Auto-creation** (2026-08-01, see `docs/decisions.md`): creating a
  Maintenance, Car Doc, or Fuel record auto-creates its linked Payment
  directly (bypassing this feature's own `create()`/validation) with
  `amount` = the record's `cost`, `status="unpaid"`, `paid_by`/`paid_to`
  left blank, and `payment_date` = the record's own transaction date if it
  has one (Fuel's `fuel_date`) or today's date otherwise (Maintenance/Car
  Docs have no transaction-date field). Lease's bulk `POST
  /leases/{id}/generate-payments` does the same for `monthly_fair`
  payments, one per due month, also `status="unpaid"`.
- **Deletion is blocked by a linked Payment only when that Payment is
  already `paid`.** Maintenance/Car Docs/Fuel's `delete()` deletes any
  still-`unpaid` linked Payment along with the record instead of blocking
  — an unpaid auto-created payment is a pending stub, not real financial
  history that needs protecting. Lease's `delete()` is unchanged (still
  blocks on any linked Payment regardless of status), since a Lease isn't
  auto-linked to a Payment the same way.
