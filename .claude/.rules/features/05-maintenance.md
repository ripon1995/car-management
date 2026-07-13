# Feature: Maintenance CRUD

## Overview
Tracks servicing/repair events for a car. Feeds into
[Payment](07-payment.md) (type `service`) and the [Revenue](08-revenue.md)
dashboard as a deduction.

## Data Model — `maintenance_records`
| Field         | Type          | Required | Notes |
|---------------|---------------|----------|-------|
| id            | uuid (PK)     | yes      | |
| type          | varchar       | yes      | enum: `service`, `battery`, `tyre`, `spare_parts`, `engine_oil` |
| cost          | numeric(12,2) | yes      | |
| service_place | varchar       | yes      | garage/shop name |
| service_by    | varchar       | yes      | mechanic/person who performed the service |
| description   | text          | no       | **(changed)** free-text detail about the record; replaces the original `name` field per user request — there is no separate short-title field, `type` + `description` together identify the record |
| car_id        | uuid (FK)     | yes      | → `cars.id` — **(added)** not in the original field list, but a maintenance record must be tied to a car; without it the record can't be attributed anywhere |
| created_at    | timestamptz   | yes      | |
| updated_at    | timestamptz   | yes      | |

## Relationships
- `car_id` → one Car has many Maintenance records.
- Each Maintenance record is expected to have a corresponding
  [Payment](07-payment.md) record with `type = service` and
  `associated_maintenance = this record's id`, whose `amount` reflects
  `cost` (see Payment doc for how amount is set).

## API Endpoints
- `GET /api/v1/maintenance` — list, filter by `car_id`, `type`; paginated.
- `POST /api/v1/maintenance`
- `GET /api/v1/maintenance/{id}`
- `PUT /api/v1/maintenance/{id}`
- `DELETE /api/v1/maintenance/{id}`

## Business Rules & Validation
- `cost` must be >= 0.
- **(resolved)** Creating a Maintenance record does **not** automatically
  create the linked Payment record. The user is expected to create the
  Payment (type `service`, `associated_maintenance` = this record's id)
  separately on the Payments page — this matches the plain-CRUD pattern of
  every other feature. Don't add auto-creation without re-confirming with
  the user first.
