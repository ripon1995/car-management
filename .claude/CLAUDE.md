# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For the "why" behind naming/rename history, features that shipped without a
written spec, and migration-by-migration narration, see `docs/decisions.md`
(not auto-loaded — read it on demand).

## Project state

10 features are fully built on both sides: the original 8 business
features (Car Owner, Vendor, Driver, Car, Maintenance, Car Docs, Payment,
Revenue) plus Auth, plus **Fuel** and **Lease** added later directly off
user instruction (no feature doc — see `docs/decisions.md` for the
rationale behind each). Backend: FastAPI app with a separate Auth/User JWT
login, full CRUD for every feature except the read-only Revenue
aggregation endpoint. Frontend: Vite + React + TypeScript, routing, auth
pages, nav shell, a page per feature to the same conventions (see
"Frontend architecture" below), plus the Revenue dashboard at `/dashboard`
(`DashboardPage.tsx`) with hand-rolled SVG donut/bar charts, plus an 11th
page, **Income** (`/income`, `IncomePage.tsx`), which is frontend-only —
no `app/features/income/` package, no model, no migration; it's composed
entirely from the existing Lease and Payment endpoints (see the Payments
bullet below and `docs/decisions.md`).

Lease is the current name for what shipped as "Enrollment" — code, docs,
and this file all say "Lease" throughout; migrations `0013`–`0016` still
say "enrollment" in their filenames/content since that was accurate at the
time they ran (don't rename them — see `docs/decisions.md`).

Maintenance, Car Docs, and Fuel **auto-create** a linked Payment row
(`status = "unpaid"`) whenever a record is created — the opposite of the
original manual-only rule. Payments carry a `status` (`paid`/`unpaid`)
column; auto-created and lease-generated payments start `unpaid` and get
flipped to `paid` via the frontend's "mark as paid" flow (`PUT
/payments/{id}`), while manually-created payments default to `paid`. This
was a deliberate reversal of the original design — see `docs/decisions.md`
for the full history and don't re-reverse it without re-confirming with
the user.

**No unit tests in this project by explicit user instruction** — don't add
a test suite unless asked.

## Backend commands

Run from `backend/`, with the venv active
(`source .car-management-venv/bin/activate`):

- Run the dev server: `uvicorn app.main:app --reload`
- Lint: `ruff check app`
- Apply migrations: `alembic upgrade head` (reads `DATABASE_URL` from `.env`, copy `.env.example` first)
- Create a migration: `alembic revision -m "message"` (written by hand — no
  live Supabase DB to autogenerate against in this environment; add
  `op.create_table`/etc. manually, following `alembic/versions/0001_create_car_owners.py`
  as a template — `0005_create_cars.py` is the template for a table with FKs
  to other feature tables, including the `unique=True` index pattern for
  `engine_number`/`chassis_number`; `0008_create_payments.py` is the
  template for a table with two optional FKs into two different sibling
  feature tables, plus non-unique filter indexes via plain
  `op.create_index`)

Dependencies are declared in `backend/pyproject.toml` (`pip install -e ".[dev]"`).
`backend/requirements.txt` is a pinned `pip freeze` snapshot of that same
venv, kept for reproducible installs (`pip install -r requirements.txt`);
`pyproject.toml` is still the source of truth for *which* packages are
direct dependencies vs. transitive — re-freeze `requirements.txt` after
changing `pyproject.toml`'s `dependencies`/`optional-dependencies`, don't
hand-edit it.

**Known Supabase gotcha:** the direct-connection host
(`db.<project-ref>.supabase.co`) often only resolves via IPv6, which fails
(`socket.gaierror`) on many networks. Use the **pooler** connection string
instead (`...pooler.supabase.com`, port `6543` transaction / `5432`
session), and remember to add `+asyncpg` to the scheme yourself — Supabase's
copy-paste string doesn't include it.

**Known Supabase gotcha #2:** the pooler's `pgbouncer` runs in transaction
mode, which doesn't support asyncpg's server-side prepared statement cache —
without a fix, concurrent requests intermittently fail with
`asyncpg.exceptions.DuplicatePreparedStatementError`. `app/db/session.py`
passes `connect_args={"statement_cache_size": 0}` to `create_async_engine`
to disable that cache; don't remove it.

**Known environment quirk:** this venv is Python 3.14 (very new). Standard
`passlib[bcrypt]` fails at runtime here (`AttributeError: module 'bcrypt'
has no attribute '__about__'`) because passlib is unmaintained and doesn't
support modern `bcrypt`. Use the `bcrypt` package's `hashpw`/`checkpw`
directly instead, as `app/core/security.py` already does — don't
reintroduce `passlib`.

## Backend architecture

The backend is organized **feature-first**, not by technical layer: each
domain from `.claude/.rules/features/` gets its own package under
`app/features/<feature>/` containing everything specific to it. Only truly
cross-cutting infrastructure lives outside `app/features/`.

- `app/core/config.py` — `pydantic-settings` reading `DATABASE_URL`,
  `ENVIRONMENT`, `ALLOW_ORIGINS`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`,
  `ACCESS_TOKEN_EXPIRE_MINUTES` from `.env`.
- `app/core/security.py` — generic, feature-agnostic crypto helpers:
  password hashing/verification (`bcrypt` directly, not `passlib` — see the
  environment quirk above) and JWT creation/decoding (`python-jose`).
- `app/core/exceptions.py` — `AppException` base class (`error_code`,
  `error_status`, `message` as class defaults; `detail` is the per-raise
  context) plus subclasses `AuthenticationException`,
  `AuthorizationException`, `NotFoundException`, `ConflictException`,
  `ValidationException`. Raise these from service layers instead of raw
  `HTTPException` so every error response has the same JSON shape.
- `app/core/exception_handler.py` — `register_exception_handlers(app)`,
  called once from `main.py`; turns any `AppException` into a JSON response
  (`error_code`/`error_status`/`detail`/`message`).
- `app/core/logging.py` — `setup_logging()` (stdlib logging config) and
  `RequestLoggerMiddleware` (logs method/path/status/duration per request).
- `app/db/` — async SQLAlchemy engine/session (`asyncpg` driver) and the
  shared declarative `Base`.
- Every feature package follows a **repository → service → router**
  layering, including Maintenance, Car Docs, and Payment:
  - `models.py` — SQLAlchemy model(s).
  - `schemas.py` — Pydantic request/response models.
  - `repository.py` — a `<Feature>Repository` class wrapping the
    `AsyncSession`: pure data access (`get_by_id`, `list_all`,
    `create`/`update`/`delete`), no business rules.
  - `service.py` — a `<Feature>Service` class taking the repository in its
    constructor: business rules (uniqueness checks, 404s via
    `NotFoundException`, etc.), plus a `get_<feature>_service(db =
    Depends(get_db))` FastAPI dependency provider that wires the repository
    and service together.
  - `router.py` — HTTP layer only: depends on the service provider, no
    direct DB/session access.
- `app/features/auth/` — the generic login identity, decoupled from every
  business entity:
  - `models.py` — `User` (`users` table: `id`, `email`, `password_hash`,
    timestamps). No relationship to any business table.
  - `schemas.py` — `UserCreate`, `UserRead`, `Token`, `TokenPayload`.
  - `repository.py` / `service.py` — `UserRepository` / `AuthService`
    (`register`, `authenticate`, `get_by_id`); raises `ConflictException`
    on duplicate email, `AuthenticationException` on bad credentials.
  - `dependencies.py` — `OAuth2Bearer` (an `OAuth2PasswordBearer` subclass
    that re-raises its bare `HTTPException` as `AuthenticationException`,
    so missing/malformed tokens get the same error shape as everything
    else) and `get_current_user`: decodes the Bearer JWT (`sub` = user id)
    and loads the row via `AuthService`. Any endpoint needing auth depends
    on this.
  - `router.py` — `register`/`login`/`me`, mounted at `/auth`.
- `app/features/car_owners/` — plain CRUD, no auth concept of its own:
  - `models.py` — `CarOwner` (`name`, `phone_number`, timestamps only —
    **no** email/password; car owners never log in).
  - `schemas.py` — `CarOwnerCreate`, `CarOwnerUpdate`, `CarOwnerRead`.
  - `repository.py` / `service.py` — `CarOwnerRepository` /
    `CarOwnerService`; `get_by_id` raises `NotFoundException` when missing.
  - `router.py` — standard list/create/get/update/delete, mounted at
    `/car-owners`. The whole router carries
    `dependencies=[Depends(get_current_user)]` from the `auth` feature —
    any logged-in user has full CRUD power, there's no per-owner scoping.
    Protect new feature routers the same way unless a feature doc says
    otherwise.
- `app/features/vendors/` and `app/features/drivers/` — plain CRUD, same
  shape as `car_owners`. `DriverService.delete()` queries
  `app.features.cars.models.Car` for any row whose `driver_id` points at the
  record being deleted and raises `ConflictException` instead of deleting
  (rather than relying on the raw FK `IntegrityError` from Postgres) — copy
  this pattern for any other feature whose deletion must be restricted
  while referenced elsewhere. `VendorService.delete()` does the same but
  against `app.features.leases.models.Lease.vendor_id` (any row, not just
  an active one), since a vendor's relationship to cars is now only
  through Lease. Vendor has **no fare field of its own** anymore —
  `monthly_fare` lives on Lease. `CarService.delete()` applies the same
  referenced-check pattern in the other direction, checking
  `MaintenanceRecord`/`CarDoc`/`Payment`/`FuelRecord`/`Lease` for any row
  whose `car_id` points at the car being deleted.
- `app/features/cars/` — the hub entity, with FKs to `car_owners`
  (`owner_id`, required) and `drivers` (`driver_id`, optional). **No
  `vendor_id`** — a car's current vendor is derived by looking up its
  Lease with `end_date IS NULL`, not stored on the car itself. `CarService`
  takes the Car Owner and Driver repositories as constructor args (see
  `get_car_service`, no `VendorRepository`) and validates: `model_year` is
  in `[1980, current_year + 1]`; `engine_number`/`chassis_number` are
  unique (`ConflictException`, checked via
  `CarRepository.get_by_engine_number`/`get_by_chassis_number`); and that
  `owner_id`/`driver_id` reference rows that actually exist
  (`NotFoundException`) — reuse this
  validate-references-via-sibling-repository approach for any future
  feature that takes a foreign key as user input. There is a single `PUT`
  endpoint (not a separate reassignment `PATCH`) since `CarUpdate` already
  makes every field optional and applies via `exclude_unset` — same
  convention as `car_owners`. No pagination/filtering on `GET /cars` yet,
  matching `car_owners`.
- `app/features/maintenance/` and `app/features/car_docs/` — car-scoped
  records, both required FK `car_id` → `cars.id` validated via
  `CarRepository`. `MaintenanceService` validates `type` against a fixed
  tuple (`service`/`battery`/`tyre`/`spare_parts`/`engine_oil`) and
  `cost >= 0`; `CarDocService` validates `cost >= 0` only (`expiry_date` is
  a plain `date`, no enum). Both routers' `GET /` accept filter query
  params (`car_id`, plus `type` for Maintenance and
  `name`/`expiring_before` for Car Docs). Both services' `create()`
  auto-create a linked `Payment` row right after the record is created —
  `type="service"`/`type="document"` respectively, `amount = cost`,
  `payment_date = date.today()` (neither feature has its own transaction
  date to reuse), `paid_by`/`paid_to` left as empty strings,
  `status="unpaid"` — created directly via `PaymentRepository(self.
  repository.db).create(...)` (inline import, bypassing `PaymentService`
  entirely) rather than going through `POST /payments`, mirroring how
  `LeaseService.generate_due_payments()` already creates Payments
  directly. Both services' `delete()` fetch every linked `Payment` (via
  `associated_maintenance`/`associated_cardocs`, inline-imported inside
  the method — not at module level — to avoid a circular import with
  `app.features.payments.service`, which imports these two features'
  repositories) and raise `ConflictException` only if one of them is
  already `status == "paid"`; any still-`unpaid` linked payments are
  deleted along with the record instead of blocking it, since an unpaid
  auto-created payment is a pending stub, not real financial history —
  don't go back to blocking on *any* linked payment regardless of status.
- `app/features/fuel/` — car-scoped like Maintenance/Car Docs: required FK
  `car_id` → `cars.id` validated via `CarRepository`. Fields:
  `fuel_type` (fixed tuple `octane`/`petrol`/`diesel`/`cng`/`other`,
  validated like Maintenance's `type`), `quantity_liters` (`>= 0`),
  `cost` (`>= 0`), `odometer_reading` (optional, `>= 0` when present, not
  yet used for any computed mileage/efficiency), `fuel_station`,
  `fuel_date` (required `date`, mirroring Payment's `payment_date`), and
  optional `description`. `GET /` filters by `car_id`, `fuel_type`, and
  `date_from`/`date_to` over `fuel_date` (same pattern as Payments).
  `FuelService.create()` auto-creates a linked `type="fuel"` `Payment`
  the same way Maintenance/Car Docs do, except `payment_date =
  record.fuel_date` rather than `date.today()`, since Fuel already has a
  real transaction date to reuse. `FuelService.delete()` fetches every
  linked `Payment` via `associated_fuel` (inline import, same
  avoid-circular-import reasoning as Maintenance/Car Docs above) and
  raises `ConflictException` only if one is already `status == "paid"`,
  deleting any still-`unpaid` ones instead of blocking — same rule as
  Maintenance/Car Docs; `CarService.delete()` also blocks deleting a car
  with fuel records.
- `app/features/leases/` — a dated car↔vendor lease period: required FKs
  `car_id` → `cars.id` and `vendor_id` → `vendors.id`, plus `monthly_fare`
  (`>= 0`, lives here rather than on Vendor or Car so a re-lease at a
  renegotiated rate doesn't overwrite history), `start_date` (required),
  `end_date` (nullable — **null means the lease is currently active**,
  setting it is how a car is "returned"). `LeaseService.create()` rejects
  with `ConflictException` if the car already has an active
  (`end_date IS NULL`) lease — only one active lease per car; ending the
  current one (via `PUT {"end_date": ...}`) is required before starting
  another. `update()` re-checks the same invariant if an edit would clear
  `end_date` back to active. `delete()` blocks with `ConflictException` if
  a `Payment` references it via `associated_lease` (inline import, same
  avoid-circular-import reasoning as Fuel/Maintenance/Car Docs).
  `GET /leases` filters by `car_id`, `vendor_id`, `active`. Two extra
  endpoints exist because rent isn't auto-generated (no scheduler/cron in
  this app): `GET /{id}/due-payments` walks months from `start_date` to
  `min(end_date or today, today)` and buckets each into
  `due_months`/`generated_months` by checking for an existing `Payment`
  with `associated_lease == id` in that month; `POST
  /{id}/generate-payments` bulk-creates a `monthly_fair` Payment (linked
  via `associated_lease`) for every due month in one call, `paid_by` = the
  vendor's name, `paid_to` = the car owner's name, `status="unpaid"` (a
  freshly generated month hasn't actually been received yet — the
  frontend's Income page is what flips it to `paid`). Because due-months
  are computed per-lease-record, a gap between one lease ending and the
  next starting for the same car naturally has no due months — don't
  reintroduce a synced `cars.vendor_id`/cron-based alternative without
  re-confirming with the user. These two endpoints used to be surfaced
  directly inside `LeasesPage.tsx`'s view modal; that UI was removed and
  replaced by the frontend-only Income page (see the Frontend architecture
  section) — the endpoints themselves are unchanged, only which page calls
  them.
- `app/features/payments/` — the money-movement ledger. Required FK:
  `car_id` → `cars.id`; optional FKs: `associated_maintenance` →
  `maintenance_records.id`, `associated_cardocs` → `car_docs.id`,
  `associated_fuel` → `fuel_records.id`, `associated_lease` → `leases.id`.
  `PaymentService` validates `type`
  (`service`/`document`/`fuel`/`monthly_fair`/`other`), that
  `associated_maintenance` is only set when `type == "service"`,
  `associated_cardocs` only when `type == "document"`, `associated_fuel`
  only when `type == "fuel"` (all three optional even for their matching
  type — a payment may exist without a formal linked record), and that
  every referenced id actually exists (`NotFoundException`, via
  `CarRepository`/`MaintenanceRepository`/`CarDocRepository`/
  `FuelRepository`/`LeaseRepository`). `associated_lease` is different:
  it's **required, not optional, whenever `type == "monthly_fair"`**
  (`ValidationException` if missing — a `monthly_fair` payment must always
  trace back to a real lease period), and when it's set, `amount` is
  **not** taken from the request at all — `PaymentService.create()`/
  `update()` silently overwrite `amount` with that Lease's `monthly_fare`
  every time (looked up via `LeaseRepository`), so a `monthly_fair`
  payment's amount can never drift from its linked lease's rate; `amount`
  stays a manually-entered required field (validated `>= 0`) only for the
  other four types. This mirrors
  `LeaseService.generate_due_payments()`'s amount-from-lease behavior —
  don't reintroduce a manual `Amount` input for `monthly_fair` payments
  without re-confirming with the user. `GET /payments` filters by
  `car_id`, `type`, `status`, and a `date_from`/`date_to` range over
  `payment_date`. `Payment.status` (`PAYMENT_STATUSES = ("paid",
  "unpaid")` in `schemas.py`) defaults to `"paid"` both at the DB level
  (`server_default="paid"` — existing/manually-created rows represent
  already-settled money movements) and in `PaymentCreate` — the three
  auto-creation paths (Maintenance/Car Docs/Fuel's `create()`, Lease's
  `generate_due_payments()`) all bypass `PaymentCreate`/`PaymentService`
  and pass `status="unpaid"` explicitly straight to `PaymentRepository`.
  `PaymentService._validate_status()` mirrors `_validate_type()`'s
  pattern. The backend's `PaymentService`/`PAYMENT_TYPES` still generically
  accept `type="service"/"document"/"fuel"` on `POST /payments` for API
  completeness — only the **frontend** narrows its manual-create dropdown
  to `MANUAL_PAYMENT_TYPES = ['other']` (see Frontend architecture), since
  service/document/fuel/monthly_fair payments are now only ever produced
  by the auto-creation paths above. `paid_by` is constrained too:
  `PAID_BY_METHODS = ("EBL", "DBBL", "UCB", "CASH")` in `schemas.py` —
  `PaymentService._validate_paid_by(type, paid_by)` requires `paid_by` be
  one of these whenever `type != "monthly_fair"` (`monthly_fair` keeps
  free text, since it's populated from the vendor's name by
  `generate_due_payments()`, not a payment-method choice). Checked on
  `create()` and on `update()` whenever `type` or `paid_by` is in the
  update payload — which, from the frontend, is always, since both
  `PaymentsPage.tsx`'s forms and `MarkPaidDialog` submit the full
  `PaymentInput` shape every time.
- `app/features/revenue/` — read-only, **no `models.py`/migration**:
  `RevenueService.get_summary()` takes the same `car_id`/date-range filters
  as Payments (via `PaymentRepository.list_all()`, additionally passing
  `status="paid"` — Revenue is **cash-basis**: `unpaid` payments are
  excluded from every total until marked paid, not counted on an accrual
  basis), fetches the matching Payment rows, and aggregates them in Python
  (not SQL) into
  `total_income`/`total_expense`/`net_revenue`, a `by_type` breakdown, a
  `by_period` breakdown (grouped by `payment_date.strftime("%Y-%m")`), and
  a `by_car` breakdown that's `null` whenever a single `car_id` is
  filtered. `type == "monthly_fair"` is income; every other type is
  expense — `INCOME_TYPE` constant in `service.py` is the single source of
  truth for that split, don't duplicate the check. This means
  `fuel`-type Payments count as expense automatically; Fuel cost only
  affects the Revenue dashboard once a Payment row (optionally linked via
  `associated_fuel`) is created for it, not directly from `fuel_records`.
  Mounted at `GET /api/v1/revenue` with `from`/`to` query param aliases
  (`Query(alias="from")` — `from` is a Python keyword) rather than
  `date_from`/`date_to`, matching `08-revenue.md`.
- `app/api.py` — thin aggregator that `include_router`s each feature's
  router(s); mounted under `/api/v1` in `app/main.py` (the version prefix
  is deliberate — keep it, don't flatten to bare `/api`). **When adding a
  new feature, create `app/features/<feature>/` following the
  repository/service/router layout above and register its router here.**
- Auth: `/api/v1/auth/{register,login,me}` (public except `/me`); login
  uses the standard OAuth2 password flow (`OAuth2PasswordRequestForm`:
  `username` = email) so Swagger's "Authorize" button works out of the box.
- `app/main.py` wiring order: `setup_logging()` →
  `register_exception_handlers(app)` → `CORSMiddleware` (origins from
  `settings.allow_origins`) → `RequestLoggerMiddleware` →
  `include_router(api_router, prefix=settings.api_v1_prefix)`.
- `alembic/env.py` imports each feature's `models` module explicitly (e.g.
  `app.features.auth.models`, `app.features.car_owners.models`,
  `app.features.vendors.models`, `app.features.drivers.models`,
  `app.features.cars.models`, `app.features.maintenance.models`,
  `app.features.car_docs.models`, `app.features.payments.models`,
  `app.features.fuel.models`, `app.features.leases.models`) so its tables
  register on `Base.metadata` before migrations run — add the new import
  there too when adding a feature. Current head is `0017`; see
  `docs/decisions.md` for the full migration-by-migration history if you
  need to understand ordering constraints between existing migrations
  before adding a new one.

## Frontend architecture

Run from `frontend/`: `npm run dev` (Vite dev server), `npm run build`
(`tsc -b && vite build`), `npm run lint` (`oxlint`). `VITE_API_URL`
(`.env`, default `http://localhost:8000/api/v1`) points at the backend.

The frontend is **feature-first** too, mirroring the backend split — each
business entity gets a page, an API module, and (if it needs more than
primitive fields) a types file. `app/features/car_owners/` on the backend
maps to `src/pages/CarOwnersPage.tsx` + `src/api/carOwners.ts` +
`src/types/carOwner.ts` on the frontend; `vendors`/`drivers`/`cars`/
`maintenance`/`car_docs`/`payments`/`fuel`/`leases` all follow the same
layout. `FuelPage.tsx` at `/fuel` (nav entry between Maintenance and Car
Docs) is copied directly from `MaintenancePage.tsx`'s modal-form/data-table/
view-modal structure, and `LeasesPage.tsx` at `/leases` (nav entry between
Cars and Vendors) is copied from `FuelPage.tsx`'s structure. Its create
form only lets `car_id`/`vendor_id` be chosen when creating a new lease
(`editingId` is falsy); editing an existing one shows them as read-only
text instead, since `LeaseUpdate` on the backend doesn't accept those two
fields — reassigning a car to a different vendor means ending the current
lease and creating a new one, not editing one in place. (This page/route/
module was originally named "Enrollment" — see `docs/decisions.md`.)
`LeasesPage.tsx` no longer surfaces due/generated-month payment status
itself — it originally had a "Payment status" section with a "Generate due
payments" button embedded in its view modal, but that was removed and
replaced by the dedicated `IncomePage.tsx` described below (see
`docs/decisions.md` for why).

Revenue and Income are both read-only/composed pages rather than CRUD
resources. Revenue is `src/pages/DashboardPage.tsx` (mounted at the
existing `/dashboard` route/nav entry, not a new `/revenue` route) +
`src/api/revenue.ts` + `src/types/revenue.ts`, and its filter controls
(`car_id`/`from`/`to`, mapping to `GET /revenue`'s query params) sit in
`.page-header`'s right-hand slot in place of the usual `.btn-primary`
create button, since there's nothing to create. Income is
`src/pages/IncomePage.tsx` at `/income` (nav entry between Leases and
Vendors) — it has **no backend feature package of its own**; it's a
computed view built entirely from `listLeases()`, `listCars()`,
`listVendors()`, `listPayments({ type: 'monthly_fair' })`, and a
per-lease `getDuePayments(lease.id)` call (the same Lease endpoints
`LeasesPage.tsx` used to call directly, see above). It derives one row
per (lease, month) from the union of each lease's `due_months`/
`generated_months`, resolving generated months to their real `Payment`
(for `status`/`id`/`amount`) and rendering due-but-not-yet-generated
months as synthetic "Not received" rows (`row.payment === null`).

The table has **two** action-bearing columns, not one (added 2026-08-01,
see `docs/decisions.md`) — "Mark received" is its own column, separate
from the `Action` column, since it's the primary/most-frequent action on
this page and the user wanted it visually distinct from
View/Edit/Delete rather than bundled in with them. **Gotcha:** each such
`<td>` wraps its button(s) in an inner `<div className="data-table-actions">`
rather than putting that class directly on the `<td>` itself — every
other page's single Action column applies `.data-table-actions`
(`display: flex`) straight to the `<td>`, which works fine with one such
cell per row, but with *two* flex `<td>`s in the same row, browsers'
table column-layout algorithm breaks: both cells collapse onto the same
column slot and stack vertically instead of sitting side by side (visible
as the row splitting into two overlapping horizontal bands). Confirmed via
`getBoundingClientRect()` on the live page, not guessed — if a third
action-bearing column is ever added anywhere, keep `display:flex` off the
`<td>` itself and put it on a child `<div>` instead:
- **"Mark received" column**: for a synthetic row (not yet generated), a
  single `.icon-btn` that calls `POST /leases/{id}/generate-payments`
  (bulk — generates every due month for that lease, not just the clicked
  one, accepted as a minor UX side-effect rather than adding a per-month
  generate endpoint), refetches due-payments + `monthly_fair` payments,
  then opens `MarkPaidDialog` for the newly-created payment matching that
  month. For a real `unpaid` row, the same icon opens `MarkPaidDialog`
  directly for that row's `Payment`. Empty (no button) for a `paid` row.
  This flow always opens the dialog with `simple` (see the Mark-paid
  dialog bullet) — Amount/Car/Type/Paid by/Paid to are already correct
  (populated by `generate_due_payments()`), so the popup only asks for
  Status/Payment date/Description, not a full edit form. Unlike `Action`
  (right-aligned as the table's actual last column via the shared
  `.data-table th:last-child`/`td:last-child` rule), "Mark received" sits
  in the middle of the table, so its single icon is centered under its
  own header rather than right/left-aligned: both the `<th>` and the
  inner `<div className="data-table-actions">` also get a
  `mark-received-col` class (styled in `IncomePage.css`, not `App.css`,
  since it's specific to this one column) that centers the header text
  and overrides `.data-table-actions`' default `justify-content:
  flex-end` to `center`.
- **`Action` column**: View/Edit/Delete, shown only for rows with a real
  `Payment` (a synthetic row has nothing to view/edit/delete yet). View
  opens a read-only `<dl className="detail-list">` modal (`viewingRow:
  IncomeRow | null` state, keyed off the row rather than just the
  `Payment` so Car/Vendor/Month can be shown even though those live on
  the row's `Lease`, not the `Payment` itself) with an "Edit" button in
  its footer that closes the view and opens the edit dialog. Edit reuses
  `MarkPaidDialog` **without** `simple` — the full Amount/Car/Type/Status/
  Paid by/Paid to/Payment date/Description form, `title="Edit payment"`
  instead of the default "Mark payment as paid" — since editing may
  legitimately need to correct `paid_by`/`paid_to`, unlike the quick
  mark-received confirmation. Same `confirmMarkPaid()` handler either way,
  just a different opening `title`/`simple` combination
  (`dialogTitle`/`isSimpleDialog` state) depending on which action
  triggered it. Delete uses the standard
  `ConfirmDialog`/`pendingDelete`/`isDeleting` pattern (see the Confirm
  dialog bullet), calling `api.deletePayment()`; deleting a generated
  monthly-fare payment also refetches that lease's due-payments so the
  row reverts to a synthetic "not generated" one instead of vanishing or
  going stale.

- `src/api/client.ts` — `request<T>(path, options)` (fetch wrapper: base
  URL, JSON headers, error → `ApiError` mapping, 401 →
  `unauthorizedHandler`) and `authHeaders()` (reads the stored JWT into an
  `Authorization` header). Feature API modules (`src/api/<feature>.ts`)
  call `request()` and pass `headers: authHeaders()` on every authenticated
  endpoint; barrel-exported through `src/api/index.ts`
  (`export * from './<feature>'`) so pages/store just `import * as api
  from '../api'`.
- `src/errors/api.ts` — `ApiError` (`status`/`message`/`detail`/
  `errorCode`); `src/components/ErrorDialog.tsx` renders one as a modal.
  Catch blocks normalize unknown errors with a local
  `toApiError(err)` helper (`err instanceof ApiError ? err : new
  ApiError(0, 'Something went wrong', 'Something went wrong')`) before
  `setError` — copy this helper into each new page rather than importing
  it, matching the existing `LoginPage`/`RegisterPage`/`CarOwnersPage`
  duplication.
- **Dark theme:** `src/index.css` defines every color as a `--token` on
  `:root`, with a `:root[data-theme='dark']` block overriding the same
  token names (don't hardcode a color anywhere in a `.css` file — add a
  token pair instead, one per theme). `src/store/themeStore.ts` (zustand)
  holds the current `Theme` (`'light' | 'dark'`), persists it to
  `localStorage` (`THEME_STORAGE_KEY` in `src/constants/config.ts`), and
  sets `document.documentElement.dataset.theme` on change/load.
  `src/components/ThemeToggle.tsx` (Sun/Moon icon button from
  `NavIcons.tsx`) is mounted inside `Header.tsx`'s `.app-header-account`,
  always visible regardless of login state. `index.html` has an inline
  `<script>` before `main.tsx` loads that reads the same storage key and
  sets `data-theme` immediately, to avoid a light-mode flash on load —
  keep that script in sync with `themeStore.ts`'s `resolveInitialTheme()`
  logic if the storage key or fallback ever changes. `Header.css`'s navy
  bar (`#0f172a`) is deliberately **not** theme-reactive — it's a fixed
  brand bar in both themes, not part of the `--surface`/`--bg` system.
- **Confirm dialog:** every destructive delete across all 9 CRUD pages
  uses `src/components/ConfirmDialog.tsx` (a `role="alertdialog"` modal
  with a danger icon, Cancel/Delete actions, and a `Loader` overlay while
  `isConfirming`) instead of `window.confirm`. The per-page pattern: a
  `pendingDelete` state (the record awaiting confirmation, or `null`) that
  a row's delete `.icon-btn` sets directly, an `isDeleting` boolean, and a
  `confirmDelete()` async function (replacing the old `handleDelete`) that
  calls the delete API, updates the list state, and always clears both
  `pendingDelete`/`isDeleting` in a `finally` block — even on error, so
  the dialog closes and `ErrorDialog` takes over showing the failure. Copy
  this shape (see `CarOwnersPage.tsx`) for any new page's delete flow;
  don't reintroduce `window.confirm`. `src/components/Loader.tsx` wraps
  `react-loader-spinner`'s `BallTriangle` (`^8.0.2`, matching
  `number-nest`'s version of the same package) — used for this overlay and
  for `LoginPage.tsx`/`RegisterPage.tsx`'s submit state (an
  `.auth-form-overlay` absolutely positioned over `.auth-form`, same
  shape as `.confirm-dialog-overlay`, shown while `isSubmitting`), but
  not for page-level list "Loading…" states, which stay plain text.
- **Mark-paid dialog:** `src/components/MarkPaidDialog.tsx` is the second
  truly-shared (not per-page-duplicated) modal, alongside `ConfirmDialog`
  — used by both `PaymentsPage.tsx` and `IncomePage.tsx` for two purposes,
  not just marking a payment paid: `PaymentsPage.tsx` opens it for its
  "mark as paid" action only; `IncomePage.tsx` opens it for **both**
  "mark as received" and its Edit action (added 2026-08-01, since
  `monthly_fair` payments are edited only from Income now — see
  `docs/decisions.md`), passing a `title` prop (`'Mark as received'` vs
  `'Edit payment'`, default `'Mark payment as paid'`) to distinguish them,
  plus a `simple?: boolean` prop for its mark-as-received call only
  (`IncomePage.tsx`'s `isSimpleDialog` state) that hides the read-only
  Amount/Car/Type fields and the editable `paid_by`/`paid_to` fields —
  those are already correct from `generate_due_payments()`, so the quick
  confirmation only shows Status/Payment date/Description. Its Edit call
  and `PaymentsPage.tsx`'s "mark as paid" call both leave `simple` unset
  (full form), since `PaymentsPage.tsx`'s auto-created payments start
  with blank `paid_by`/`paid_to` that genuinely need entering. Standard
  `.modal-backdrop`/`.modal-panel.card`/`.form-field` shell; fields are
  seeded from the target `Payment` prop via a `useEffect` keyed on
  `payment?.id` (`status` seeds from `payment.status`, not hardcoded to
  `'paid'`, so opening it to edit an already-paid or still-unpaid row
  shows its real status rather than silently flipping it). Both pages'
  call sites build a full `PaymentInput`
  (spreading the source payment's other fields, not a partial) before
  `api.updatePayment(id, ...)`, since `updatePayment` takes the complete
  shape. Reuse this component rather than duplicating the status-change
  form per page. `Paid by` renders as a free-text `<input>` when
  `payment.type === 'monthly_fair'`, otherwise as a `<select>` over
  `PAID_BY_METHODS` (`src/types/payment.ts` — `['EBL', 'DBBL', 'UCB',
  'CASH']`), matching the backend's `_validate_paid_by()`.
- Shared page-chrome classes live in `App.css` (global, not per-page) since
  every feature page reuses them — add new cross-page primitives there,
  not in a page's own CSS file:
  - `.page-header` — flex row, `justify-content: space-between`, wraps the
    `<h1 className="page-title">` (icon from `NavIcons.tsx` + title) and
    the primary action button. This is what pins the action button to the
    **top right** of the page — always wrap a feature page's title + main
    action in `.page-header`, don't build a one-off header layout.
  - `.btn-primary` — the accent-colored action button (icon + short label,
    e.g. `<PlusIcon /> Add owner` — icon first, label short not
    `"Add car owner"`). Reuse for every page's main create action.
  - `.card` — generic surface (`var(--surface)` bg, border, shadow,
    rounded corners) for panels/tables/detail views.
  - `.status-badge` (plus `.paid`/`.unpaid` modifiers, using the existing
    `--status-good`/`--status-critical` token pairs) — the Paid/Unpaid and
    Received/Not received pill used by both `PaymentsPage.tsx`'s table/
    view modal and `IncomePage.tsx`'s table. Added as a cross-page
    primitive here rather than in either page's own CSS file, same
    reasoning as `.page-header`/`.btn-primary`/`.card`.
- List pages render records in a full-width `<table className="data-table">`
  wrapped in `<div className="data-table-wrap card">` — both classes are
  shared in `App.css`, not per-feature CSS. `.data-table` rows get a
  background-tint hover transition for free; headers are bold
  (`.data-table th`, `font-weight: 700`). The **first column is always
  `SL`** (1-based row index via `.map((row, index) => ...)`, not the
  record's id/uuid). The **last column is always `Action`**
  (right-aligned via `.data-table th:last-child`) containing three
  `.icon-btn`s per row (`ViewIcon`/`EditIcon`/`DeleteIcon` from
  `NavIcons.tsx`; delete uses `className="icon-btn danger"` for the
  `--status-critical` hover tint). `.icon-btn` has a `1px solid
  var(--border)` border, matching `.app-nav-icon` in `NavMenu.css` — icon
  buttons everywhere in this app get that bordered-square look, not bare
  icons. Copy this exact pattern (see `CarOwnersPage.tsx`) rather than
  inventing row actions, a text-link style, or a different column order
  per feature.
- Create/edit/view forms are **real modals**, not inline cards, using the
  shared `App.css` classes `.modal-backdrop` (fixed inset, centered,
  semi-transparent, `onClick` closes) wrapping a `.modal-panel.card` panel
  (`role="dialog"`, `aria-modal`, `aria-labelledby`,
  `onClick={(e) => e.stopPropagation()}` so backdrop clicks don't bubble
  into the panel). Escape key and backdrop click both close it; the first
  field autofocuses on open for create/edit (see `CarOwnersPage.tsx`'s
  `nameInputRef` + the `isFormOpen` effect). Every field is wrapped in a
  `<label className="form-field">` containing a
  `<span className="form-field-label">` (the field's name, e.g. `Owner`,
  plus `(optional)` appended for non-required fields) followed by the
  input/select/textarea — a visible label on the left, the control on the
  right. Wrapping the control in `<label>` gives it its accessible name
  natively, so no separate `aria-label` is needed. `placeholder` is
  reserved for a format example on top of the label (e.g. `e.g. 1500.00`
  on a cost/amount field), not as a stand-in for the label itself — don't
  go back to placeholder-only fields with no visible label (see
  `docs/decisions.md` for why this was fixed across every feature in one
  pass). `AuthForm.css`'s login/register forms predate this convention and
  use their own visible-label markup; don't backport this exact
  `.form-field` structure onto those two pages without being asked, but
  they already satisfy the same "field must have a visible label" intent.
  Footer actions use the shared `.modal-actions` class
  (`justify-content: space-between`): **Cancel/Close bottom-left**,
  primary action (`.btn-primary`) **bottom-right**. A read-only "view"
  modal (opened from the table's `ViewIcon`) reuses the same
  `.modal-backdrop`/`.modal-panel.card` shell with a
  `<dl className="detail-list">` instead of form inputs — see
  `CarOwnersPage.tsx`'s `viewingOwner` modal.
- `.modal-panel` also styles bare `select`/`textarea` elements the same as
  `input` (added for Vendor/Driver's `address` textarea and Car's
  owner/driver `select`s) — reuse these rather than styling a one-off. For
  a feature whose form needs to pick another feature's record (like Car
  picking a Car Owner/Driver, or Lease picking a Car/Vendor), fetch that
  sibling feature's list in the same page-load `Promise.all` as the page's
  own list (see `CarsPage.tsx`), use it to populate the `<select>` options
  in the form, and reuse it again to resolve id → name for display in the
  table and view modal (there's no expanded/joined read from the API —
  `CarRead` only carries the raw FK ids). Car specifically is picked by
  five sibling features (Maintenance, Car Docs, Payments, Fuel, Leases),
  all of which display it via the shared `carDisplayLabel(car)` helper
  exported from `src/types/car.ts` — brand + model, plus the last 4 digits
  of `registration_number` in parens when present (e.g.
  `Toyota Corolla (4321)`). This is the one cross-page-shared (not
  copy-pasted-per-page) display helper in the frontend — don't reintroduce
  a local per-page `${car.brand} ${car.model_name ?? ''}` duplicate;
  import and use `carDisplayLabel` instead. Each of those 5 pages' own
  local `carLabel(carId)` helper still does the `cars.find` id lookup,
  then delegates formatting to `carDisplayLabel`. `CarsPage.tsx`'s own
  `vendorName(carId)` helper (no `Vendor` FK left on `Car` to look up
  directly) instead finds the active lease for that car id in a
  `listLeases({ active: true })` list fetched alongside cars/owners/
  vendors/drivers, then resolves that lease's `vendor_id` to a name — the
  one car-related lookup here that goes through a second sibling feature
  (Lease) rather than a direct FK on `Car`.
- `NavIcons.tsx` holds every icon as a small inline-SVG component built
  from the shared `iconProps()` helper (24×24 viewBox, `stroke="currentColor"`,
  `strokeWidth="1.5"`) — add new icons here (e.g. `PlusIcon`) rather than
  inlining SVG in a page.
- Auth/session state lives in `src/store/authStore.ts` (zustand), not
  per-page state — feature pages only hold their own list/form/loading
  state locally with `useState`, matching `CarOwnersPage.tsx`.
- **`PaymentsPage.tsx` never shows `monthly_fair` payments** (added
  2026-08-01, see `docs/decisions.md`) — that type lives entirely on the
  Income page now. The page-load fetch filters them out of state
  (`paymentsData.filter((payment) => payment.type !== 'monthly_fair')`,
  since `GET /payments` has no "not equal" filter), the Type `<select>`
  uses `EDITABLE_PAYMENT_TYPES = PAYMENT_TYPES.filter((type) => type !==
  'monthly_fair')` in edit mode (create mode still uses
  `MANUAL_PAYMENT_TYPES = ['other']`), and the page no longer fetches
  `listLeases()`/`listVendors()` or renders a "Linked lease" field —
  since `monthly_fair` can't reach this page, `Paid by` is unconditionally
  the `PAID_BY_METHODS` `<select>` (no free-text branch) and `Amount` is
  unconditionally shown (no more `type !== 'monthly_fair'` guard around
  it). The form conditionally renders the `associated_maintenance` select
  only when `type === 'service'`, `associated_cardocs` only when
  `type === 'document'`, `associated_fuel` only when `type === 'fuel'`
  (mirroring the backend's validation), clearing the other two whenever
  `type` changes (`handleTypeChange`); both selects filter their options
  down to the currently-selected `car_id` when one is chosen. Reuse this
  conditional-field-by-type pattern for any future feature whose form
  fields depend on a sibling `type`/enum field. The page fetches
  `listFuelRecords()` in the same page-load `Promise.all` as cars/
  maintenance/car docs, and labels a fuel option via a local
  `fuelRecordLabel(record)` (`${fuel type label} — ${fuel_station}`),
  matching `maintenanceRecordLabel`/`carDocRecordLabel`'s
  one-line-identifying-string shape.
  The table has a `Status` column (`.status-badge`) and, for any row with
  `status === 'unpaid'`, a "mark as paid" `.icon-btn` (`CheckIcon` from
  `NavIcons.tsx`) that opens the shared `MarkPaidDialog` (see the
  Mark-paid dialog bullet above) instead of the usual edit form —
  `confirmMarkPaid()` builds a full `PaymentInput` from the target payment
  plus the dialog's updates and calls `api.updatePayment`, same
  try/finally shape as `confirmDelete()`.
- `CarDocsPage.tsx` colors an already-past `expiry_date` cell with
  `.expired` (`var(--status-critical)`, defined in the page's own CSS
  file rather than `App.css` since no other feature needs it yet) — a
  light touch on top of the standard table, not a full "expiring soon"
  filter/reminder system (that's flagged as suggested-not-required in
  `06-car-docs.md`; ask before building it out further).
- `DashboardPage.tsx` has **no chart library dependency** — the by-type
  donut and by-period grouped bar chart are hand-rolled inline SVG
  (`<circle strokeDasharray>` arcs for the donut, `<rect>` bars for the bar
  chart), colored from the categorical palette in `.claude/skills` →
  dataviz's `references/palette.md` (validated via that skill's
  `scripts/validate_palette.js`) rather than the app's single `--accent`
  token. See `docs/decisions.md` for why; if a future feature needs
  another chart, reuse this approach rather than introducing a chart
  library without checking with the user first. The stat tiles/donut/bar
  chart all render `summary` straight from `GET /revenue` (already
  cash-basis server-side — see the Revenue bullet above). The **drill-down
  table** (shown only in `filteredMode`, i.e. a car/date filter is active)
  is different: it fetches raw `Payment` rows directly via
  `api.listPayments(...)` and computes `signed`/`paymentsNet` locally
  (`type === INCOME_TYPE ? +amount : -amount`) rather than reading
  `summary`, so that fetch also passes `status: 'paid'` (added
  2026-08-01, see `docs/decisions.md`) — without it, an `unpaid` row in
  the filtered range would count toward the drill-down's local net total
  while being excluded from the top-line `summary.net_revenue`, silently
  disagreeing with itself. Keep both fetches (`getRevenue`/`listPayments`)
  paid-only if either one's filtering logic changes.

## What this project is

A car fleet management system.
- **Backend:** FastAPI + Supabase (Postgres), Python managed with pyenv.
- **Frontend:** React.

## Architecture: the feature specs are the source of truth

Before implementing any feature, read the relevant doc in
`.claude/.rules/features/`. These are the authoritative data model and API
design for this project — start with `00-overview.md` for the business
model and cross-cutting conventions, then the numbered doc for the specific
feature:

| File | Feature |
|---|---|
| `01-car.md` | Car CRUD |
| `02-vendor.md` | Vendor CRUD |
| `03-driver.md` | Driver CRUD |
| `04-car-owner.md` | Car Owner CRUD |
| `05-maintenance.md` | Maintenance CRUD |
| `06-car-docs.md` | Car Docs CRUD |
| `07-payment.md` | Payment CRUD |
| `08-revenue.md` | Revenue (dashboard only, no table) |
| `09-auth.md` | Auth (cross-cutting, not one of the 8 business features) |

### Domain model, in one paragraph

A **Car Owner** owns one or more **Cars**. Each Car has a **Driver**
assigned to operate it — a current-assignment foreign key on `cars`, not a
history table. A Car's relationship to a **Vendor** is different: it's a
dated lease tracked by **Lease** (`car_id` + `vendor_id` +
`monthly_fare` + `start_date`/`end_date`, `end_date IS NULL` meaning
currently active) rather than a bare FK on `cars` — a vendor leases
specific cars for specific periods at a per-period fare, and a returned car
has a gap where no fare accrues until it's re-leased. **Maintenance** and
**Car Docs** are car-scoped records for servicing and document tracking
respectively. **Payment** is the single ledger of all money movements for a
car (`type`: `service`, `document`, `fuel`, `monthly_fair`, `other`;
`status`: `paid`/`unpaid`), optionally linked back to the
Maintenance/CarDocs/Fuel record that generated it — except `monthly_fair`,
whose link to a Lease is **mandatory**, and whose `amount` is always
derived from that Lease's `monthly_fare` rather than entered by hand.
Creating a Maintenance/Car Docs/Fuel record auto-creates its linked
Payment as `unpaid`; a Lease's due months are turned into `unpaid`
`monthly_fair` Payments via the Income page; either is flipped to `paid`
through a "mark as paid" action once the money actually moves. **Revenue**
has no table of its own — it is a cash-basis dashboard computed on the fly
from `paid` Payment records only (`unpaid` ones are excluded from every
total until marked paid): `monthly_fair` payments count as income, every
other type is deducted as expense. None of this connects to **Auth** —
`users` is an isolated login identity gating access to the whole API;
there's no ownership/role model.

### Conventions (see `00-overview.md` for full detail)
- Every table: `id` (UUID PK), `created_at`, `updated_at`.
- Hard deletes by default; FK deletes are restricted, not cascaded, unless
  a feature doc says otherwise.
- API base path: `/api/v1/`, standard REST CRUD per resource
  (`GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`).
- Fields marked **(added)** or **(assumption)** in a feature doc were not
  explicitly specified by the user and were inferred to make the data
  model workable (e.g. `payments.car_id`/`amount`/`payment_date`) — treat
  these as settled unless the doc says otherwise, but they're worth a
  second look if requirements change.
