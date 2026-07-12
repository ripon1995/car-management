# Feature: Car CRUD

## Overview
Core entity of the system. Represents a physical vehicle, linked to its
owner, its currently assigned vendor, and its currently assigned driver.

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
| vendor_id          | uuid (FK)     | no       | → `vendors.id`, current assignment |
| driver_id          | uuid (FK)     | no       | → `drivers.id`, current assignment |
| created_at         | timestamptz   | yes      | |
| updated_at         | timestamptz   | yes      | |

## Relationships
- `owner_id` → one Car Owner can own many Cars.
- `vendor_id` → one Vendor can currently hold many Cars; a Car has one
  current Vendor.
- `driver_id` → one Driver can currently be assigned to many Cars (or
  enforce 1:1 at the application layer if a driver should only run one car).
- **(assumption)** These FKs only capture the *current* assignment. If
  history of past vendor/driver assignments per car is needed (e.g. "which
  vendor had this car in March"), a separate `car_assignment_history` table
  would be needed — not built here; flag if this matters.

## API Endpoints
All endpoints require authentication (see [Auth](09-auth.md)); any
logged-in user can manage any car.
- `GET /api/v1/cars` — list (not yet implemented: pagination/filtering by
  `owner_id`/`vendor_id`/`driver_id`/`brand` — currently returns all rows,
  matching [Car Owner](04-car-owner.md)'s current state).
- `POST /api/v1/cars`
- `GET /api/v1/cars/{id}` — retrieve; returns the raw FK ids only, no
  expanded owner/vendor/driver summaries (the frontend resolves id → name
  itself by fetching those lists separately, see `CarsPage.tsx`).
- `PUT /api/v1/cars/{id}` — every field is optional and applied via
  `exclude_unset`, so this doubles as the reassignment action (e.g.
  `PUT {"vendor_id": ...}`) — **implemented as a single `PUT`, no separate
  `PATCH`**, consistent with `car_owners`.
- `DELETE /api/v1/cars/{id}`

## Business Rules & Validation
- `engine_number` and `chassis_number` must be unique across all cars
  (`ConflictException` on violation).
- `model_year` must be in `[1980, current year + 1]` (`ValidationException`
  otherwise).
- `owner_id` (and `vendor_id`/`driver_id` when provided) must reference an
  existing row, checked against the respective feature's repository
  (`NotFoundException` otherwise) — `CarService` takes the Car Owner,
  Vendor, and Driver repositories as constructor dependencies for this.
- Deleting a Car referenced by Maintenance/CarDocs/Payment records: not yet
  relevant since none of those tables exist yet — revisit (restrict vs.
  cascade) when they're built.