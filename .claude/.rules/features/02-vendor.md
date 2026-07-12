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
All endpoints require authentication (see [Auth](09-auth.md)); any
logged-in user can manage any vendor.
- `GET /api/v1/vendors` — list (not yet implemented: pagination/filtering
  by `name` — currently returns all rows, matching
  [Car Owner](04-car-owner.md)'s current state).
- `POST /api/v1/vendors`
- `GET /api/v1/vendors/{id}` — retrieve; does **not** include currently
  assigned cars (no expanded/joined reads implemented for any feature yet).
- `PUT /api/v1/vendors/{id}`
- `DELETE /api/v1/vendors/{id}`

## Business Rules & Validation
- `contact_number` / `whatsapp_number` format validation: **not
  implemented** — accepted as free-form strings for now.
- `monthly_fare` must be >= 0 (`ValidationException` otherwise).
- Deleting a Vendor currently assigned to one or more Cars is restricted:
  `VendorService.delete` queries `cars` for any row with a matching
  `vendor_id` and raises `ConflictException` instead of deleting, rather
  than relying on the FK constraint to reject it.