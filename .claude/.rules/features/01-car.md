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
- `GET /api/v1/cars` — list, filter by `owner_id`, `vendor_id`, `driver_id`,
  `brand`; paginated.
- `POST /api/v1/cars` — create.
- `GET /api/v1/cars/{id}` — retrieve, ideally with expanded owner/vendor/driver
  summaries.
- `PUT /api/v1/cars/{id}` — full update.
- `PATCH /api/v1/cars/{id}` — partial update (e.g. reassign vendor/driver only).
- `DELETE /api/v1/cars/{id}` — delete.

## Business Rules & Validation
- `engine_number` and `chassis_number` must be unique across all cars.
- `model_year` should be a sane integer range (e.g. 1980–current year + 1).
- Reassigning `vendor_id` or `driver_id` should be a first-class action
  (e.g. `PATCH`) rather than requiring a full `PUT`, since this is likely a
  frequent operation.
- Deleting a Car referenced by Maintenance/CarDocs/Payment records: decide
  on cascade vs. restrict. **(assumption: restrict — require those child
  records to be handled first, or soft-delete the car instead.)**