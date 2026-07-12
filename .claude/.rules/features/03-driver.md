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
  (numeric) field may belong here, similar to `vendors.monthly_fare`.
  Not added by default — add if confirmed.

## API Endpoints
- `GET /api/v1/drivers` — list, filter by `name`; paginated.
- `POST /api/v1/drivers`
- `GET /api/v1/drivers/{id}` — consider including currently assigned car(s).
- `PUT /api/v1/drivers/{id}`
- `DELETE /api/v1/drivers/{id}`

## Business Rules & Validation
- `contact_number` / `whatsapp_number` basic phone format validation.
- Deleting a Driver currently assigned to a Car: restrict deletion (or
  require unassigning first) rather than silently nulling
  `cars.driver_id`. **(assumption — confirm desired behavior.)**