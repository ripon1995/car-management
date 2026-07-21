# Feature: Vendor CRUD

## Overview
A Vendor leases cars from owners to operate. A vendor's leases — which
cars, at what fare, since when — are tracked by the separate Lease
feature (`app/features/leases/`, no numbered doc, see `CLAUDE.md`; briefly
called "Enrollment" before being renamed), not by any field on Vendor
itself.

## Data Model — `vendors`
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
- One Vendor ↔ many Leases (`leases.vendor_id`), and through
  those, many Cars. There is **no direct FK between Vendor and Car** —
  `cars.vendor_id` and `vendors.monthly_fare` (originally modeled as a
  single value on the vendor) were both removed once it became clear a
  vendor leases specific cars for dated periods at a per-period fare, not
  one fixed fare for everything it holds. See the Lease feature
  (documented in `CLAUDE.md`, not a numbered doc) for the current model.

## API Endpoints
All endpoints require authentication (see [Auth](09-auth.md)); any
logged-in user can manage any vendor.
- `GET /api/v1/vendors` — list (not yet implemented: pagination/filtering
  by `name` — currently returns all rows, matching
  [Car Owner](04-car-owner.md)'s current state).
- `POST /api/v1/vendors`
- `GET /api/v1/vendors/{id}` — retrieve; does **not** include currently
  leased cars (no expanded/joined reads implemented for any feature yet;
  fetch `GET /leases?vendor_id={id}` separately).
- `PUT /api/v1/vendors/{id}`
- `DELETE /api/v1/vendors/{id}`

## Business Rules & Validation
- `contact_number` / `whatsapp_number` format validation: **not
  implemented** — accepted as free-form strings for now.
- Deleting a Vendor referenced by one or more Leases (active or past)
  is restricted: `VendorService.delete` queries `leases` for any row
  with a matching `vendor_id` and raises `ConflictException` instead of
  deleting, rather than relying on the FK constraint to reject it.
