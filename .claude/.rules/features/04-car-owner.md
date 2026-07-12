# Feature: Car Owner CRUD

## Overview
The owner of one or more cars. Receives the vendor's monthly fare as income
(see [Revenue](08-revenue.md)). **Car Owner is plain data, not a login
identity** — car owners never authenticate with this system. All CRUD
operations on car owners require a valid session from the separate
[Auth](09-auth.md) feature ("whoever is logged in has full CRUD power"),
but there is no per-owner data scoping.

## Data Model — `car_owners`
| Field        | Type          | Required | Notes |
|--------------|---------------|----------|-------|
| id           | uuid (PK)     | yes      | |
| name         | varchar       | yes      | |
| phone_number | varchar       | yes      | |
| created_at   | timestamptz   | yes      | |
| updated_at   | timestamptz   | yes      | |

## Relationships
- One Car Owner ↔ many Cars (`cars.owner_id`).

## API Endpoints
All endpoints require authentication (see [Auth](09-auth.md)); there is no
public/unauthenticated access and no ownership-based restriction — any
logged-in user can manage any car owner record.
- `GET /api/v1/car-owners` — list; paginated (not yet implemented: pagination/filtering — currently returns all rows).
- `POST /api/v1/car-owners`
- `GET /api/v1/car-owners/{id}`
- `PUT /api/v1/car-owners/{id}`
- `DELETE /api/v1/car-owners/{id}`

## Business Rules & Validation
- `phone_number` basic phone format validation.
- Deleting a Car Owner who still owns Cars: restrict deletion, since
  `cars.owner_id` is required (not nullable).
