# Feature: Car Docs CRUD

## Overview
Tracks documents/costs associated with a car (e.g. registration, insurance,
fitness certificate) including expiry and cost.

## Data Model — `car_docs`
| Field       | Type          | Required | Notes |
|-------------|---------------|----------|-------|
| id          | uuid (PK)     | yes      | |
| name        | varchar       | yes      | e.g. "Registration", "Insurance", "Fitness Certificate" |
| expiry_date | date          | yes      | |
| cost        | numeric(12,2) | yes      | |
| car_id      | uuid (FK)     | yes      | → `cars.id` |
| created_at  | timestamptz   | yes      | |
| updated_at  | timestamptz   | yes      | |

## Relationships
- `car_id` → one Car has many Car Docs.

## API Endpoints
- `GET /api/v1/car-docs` — list, filter by `car_id`, `name`, and
  `expiring_before` (date) for renewal-due queries; paginated.
- `POST /api/v1/car-docs`
- `GET /api/v1/car-docs/{id}`
- `PUT /api/v1/car-docs/{id}`
- `DELETE /api/v1/car-docs/{id}`

## Business Rules & Validation
- `cost` must be >= 0.
- **(suggested, not required for MVP)** A scheduled job/endpoint that
  surfaces docs expiring within N days, to power reminders/alerts in the
  UI. Not built by default — flag if wanted.
