# Feature: Driver CRUD

## Overview
A Driver is the person who operates a Car day-to-day.

## Data Model — `drivers`
| Field           | Type          | Required | Notes |
|-----------------|---------------|----------|-------|
| id              | uuid (PK)     | yes      | |
| name            | varchar       | yes      | |
| address         | text          | yes      | |
| contact_number  | varchar       | yes      | |
| whatsapp_number | varchar       | no       | may differ from contact number |
| created_at      | timestamptz   | yes      | |
| updated_at      | timestamptz   | yes      | |

## Relationships
- One Driver ↔ many Cars (`cars.driver_id`), current assignment.
- **(assumption)** No salary/payroll field was specified for Driver. If the
  owner pays driver salaries (see [Payment](07-payment.md)), a `salary`
  (numeric) field may belong here — or, if salary can change over time or
  driver assignment has its own start/end dates worth tracking, a dated
  record similar to how [Vendor](02-vendor.md)'s per-car fare is modeled by
  Enrollment rather than a static field. Not added by default — add if
  confirmed.

## API Endpoints
All endpoints require authentication (see [Auth](09-auth.md)); any
logged-in user can manage any driver.
- `GET /api/v1/drivers` — list (not yet implemented: pagination/filtering
  by `name` — currently returns all rows, matching
  [Car Owner](04-car-owner.md)'s current state).
- `POST /api/v1/drivers`
- `GET /api/v1/drivers/{id}` — retrieve; does **not** include currently
  assigned car(s) (no expanded/joined reads implemented for any feature
  yet).
- `PUT /api/v1/drivers/{id}`
- `DELETE /api/v1/drivers/{id}`

## Business Rules & Validation
- `contact_number` / `whatsapp_number` format validation: **not
  implemented** — accepted as free-form strings for now.
- Deleting a Driver currently assigned to a Car is restricted:
  `DriverService.delete` queries `cars` for any row with a matching
  `driver_id` and raises `ConflictException` instead of deleting, rather
  than relying on the FK constraint to reject it.