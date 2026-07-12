# Feature: Vendor CRUD

## Overview
A Vendor leases cars from owners to operate, paying a fixed monthly fare
per car.

## Data Model — `vendors`
| Field           | Type          | Required | Notes |
|-----------------|---------------|----------|-------|
| id              | uuid (PK)     | yes      | |
| name            | varchar       | yes      | |
| address         | text          | yes      | |
| contact_number  | varchar       | yes      | |
| whatsapp_number | varchar       | no       | may differ from contact number |
| monthly_fare    | numeric(12,2) | yes      | fare paid to the owner per car per month |
| created_at      | timestamptz   | yes      | |
| updated_at      | timestamptz   | yes      | |

## Relationships
- One Vendor ↔ many Cars (`cars.vendor_id`), current assignment.
- **(assumption)** `monthly_fare` is modeled as a single value on the vendor.
  If fare can differ per car (not just per vendor), move `monthly_fare` onto
  the car↔vendor assignment instead of the vendor record. Confirm which is
  correct for your business.

## API Endpoints
- `GET /api/v1/vendors` — list, filter by `name`; paginated.
- `POST /api/v1/vendors`
- `GET /api/v1/vendors/{id}` — consider including currently assigned cars.
- `PUT /api/v1/vendors/{id}`
- `DELETE /api/v1/vendors/{id}`

## Business Rules & Validation
- `contact_number` / `whatsapp_number` should be validated for basic phone
  format (country-code aware if operating in one region, e.g. `+880...`).
- `monthly_fare` must be >= 0.
- Deleting a Vendor currently assigned to one or more Cars: restrict deletion
  (or require unassigning cars first) rather than silently nulling
  `cars.vendor_id`. **(assumption — confirm desired behavior.)**