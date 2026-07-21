# Car Management System — Feature Overview

## Stack
- **Backend:** FastAPI + Supabase (Postgres), managed with pyenv
- **Frontend:** React

## Business Model
A **Car Owner** owns one or more cars. Each car can be leased out to a
**Vendor** who pays a **monthly fare** to operate it — this is a dated
lease (a **Lease**: which car, which vendor, what fare, since when,
and optionally until when), not a fixed one-time assignment, since a car
can be leased, returned, and re-leased (possibly to a different vendor at
a different fare) over its lifetime, with no fare owed during any gap
between leases. See [Car CRUD](01-car.md) and [Vendor CRUD](02-vendor.md)
for the current shape of this relationship (it started as a bare
current-assignment FK + a fixed vendor-level fare and was reworked into
Lease after launch — see `CLAUDE.md`'s "Project state"; this feature was
briefly called "Enrollment" before being renamed). A **Driver**
is assigned to operate the car day-to-day (still a plain current-assignment
FK, unlike Vendor). **Payment** records every money movement tied to a car
(`monthly_fair` = income, `service` / `document` / `fuel` / `other` =
expense); `monthly_fair` payments must link back to the Lease that
generated them, with the amount always taken from that Lease's fare
rather than entered by hand. **Revenue** is a dashboard-only aggregation
(pie + bar charts) computed on the fly from Payment records — it has no
table of its own. **Auth is a separate, generic login identity** (`users`
table, custom FastAPI JWT, email + password) decoupled from every business
entity — Car Owners themselves never log in; whoever is authenticated has
full CRUD power over all resources. See [Auth](09-auth.md).

## Features
1. [Car CRUD](01-car.md)
2. [Vendor CRUD](02-vendor.md)
3. [Driver CRUD](03-driver.md)
4. [Car Owner CRUD](04-car-owner.md)
5. [Maintenance CRUD](05-maintenance.md)
6. [Car Docs CRUD](06-car-docs.md)
7. [Payment](07-payment.md)
8. [Revenue](08-revenue.md)
9. [Auth](09-auth.md) — cross-cutting, not part of the 8 business features

## Conventions used across all features
- All tables have `id` (UUID, PK, default `gen_random_uuid()`), `created_at`,
  `updated_at` (timestamptz, default `now()`).
- Soft delete is **not** assumed by default — deletes are hard deletes unless
  a feature doc says otherwise. Revisit if audit history is needed.
- FK fields are named `<entity>_id` and are nullable unless marked required.
- API base path: `/api/v1/`.
- Every CRUD resource exposes: `GET /` (list, paginated + filterable),
  `POST /` (create), `GET /{id}`, `PUT /{id}` (or `PATCH`), `DELETE /{id}`.
- Fields not explicitly given by the user are marked **(assumption)** in the
  relevant doc so they're easy to find and revise.