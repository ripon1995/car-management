# Feature: Car CRUD

## Overview
Core entity of the system. Represents a physical vehicle, linked to its
owner and its currently assigned driver. Its current vendor (if leased out)
is **not** a field on Car — see "Relationships" below.

## Data Model — `cars`
| Field              | Type          | Required | Notes |
|--------------------|---------------|----------|-------|
| id                 | uuid (PK)     | yes      | |
| brand              | varchar       | yes      | e.g. "Toyota" |
| model_name         | varchar       | no       | **(assumption)** e.g. "Corolla" — not in original spec but brand+year alone is hard to identify a car by; add if useful |
| model_year         | integer       | yes      | manufacture/model year |
| registration_number| varchar       | no       | **(assumption)** license plate — strongly recommended for a fleet system, add if applicable in your jurisdiction |
| engine_number      | varchar       | yes      | unique |
| chassis_number     | varchar       | yes      | unique |
| tyre_size          | varchar       | yes      | e.g. "195/65R15" |
| owner_id           | uuid (FK)     | yes      | → `car_owners.id` |
| driver_id          | uuid (FK)     | no       | → `drivers.id`, current assignment |
| created_at         | timestamptz   | yes      | |
| updated_at         | timestamptz   | yes      | |

## Relationships
- `owner_id` → one Car Owner can own many Cars.
- `driver_id` → one Driver can currently be assigned to many Cars (or
  enforce 1:1 at the application layer if a driver should only run one car).
- **No `vendor_id`.** A car's vendor relationship is dated (a lease has a
  start, and often an end), so it's tracked by the separate Enrollment
  feature (`app/features/enrollments/`, no numbered doc — see `CLAUDE.md`)
  rather than a bare current-assignment FK on `cars`. A car's *current*
  vendor, if any, is whichever Enrollment references this `car_id` with
  `end_date IS NULL`. This was originally a bare `vendor_id` FK (see git
  history / migrations `0005`, `0013`–`0014`) and was replaced once it
  became clear cars go through repeated lease/return cycles with gaps
  between them that must not accrue fare.
- `driver_id` still has the same **(assumption)** as before: it only
  captures the *current* assignment. If history of past driver assignments
  per car is needed, a separate table would be needed — not built here;
  flag if this matters. (Vendor assignment history is already covered by
  Enrollment.)

## API Endpoints
All endpoints require authentication (see [Auth](09-auth.md)); any
logged-in user can manage any car.
- `GET /api/v1/cars` — list (not yet implemented: pagination/filtering by
  `owner_id`/`driver_id`/`brand` — currently returns all rows, matching
  [Car Owner](04-car-owner.md)'s current state). To find a car's current
  vendor, query `GET /enrollments?car_id={id}&active=true` separately.
- `POST /api/v1/cars`
- `GET /api/v1/cars/{id}` — retrieve; returns the raw FK ids only, no
  expanded owner/driver summaries (the frontend resolves id → name
  itself by fetching those lists separately, see `CarsPage.tsx`).
- `PUT /api/v1/cars/{id}` — every field is optional and applied via
  `exclude_unset` — **implemented as a single `PUT`, no separate
  `PATCH`**, consistent with `car_owners`.
- `DELETE /api/v1/cars/{id}`

## Business Rules & Validation
- `engine_number` and `chassis_number` must be unique across all cars
  (`ConflictException` on violation).
- `model_year` must be in `[1980, current year + 1]` (`ValidationException`
  otherwise).
- `owner_id` (and `driver_id` when provided) must reference an
  existing row, checked against the respective feature's repository
  (`NotFoundException` otherwise) — `CarService` takes the Car Owner and
  Driver repositories as constructor dependencies for this.
- Deleting a Car referenced by Maintenance/CarDocs/Payment/Fuel/Enrollment
  records is restricted (`ConflictException`), not cascaded.
