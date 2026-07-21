# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

All 8 business features plus Auth are fully built on both sides. Backend
(FastAPI app, separate Auth/User JWT login): Car Owner, Vendor, Driver,
Car, Maintenance, Car Docs, and Payment CRUD, plus the read-only Revenue
aggregation endpoint. Frontend (Vite + React + TypeScript, routing, auth
pages, nav shell): Car Owner, Vendor, Driver, Car, Maintenance, Car Docs,
and Payment pages all built to the same conventions (see "Frontend
architecture" below), plus the Revenue dashboard at `/dashboard`
(`DashboardPage.tsx`) with hand-rolled SVG donut/bar charts. Maintenance
and Car Docs do **not** auto-create their linked Payment row — that was an
open question in the feature docs, resolved as: Payments are created
manually/independently on the Payments page (matches the plain-CRUD
pattern of every other feature; user's explicit call, don't revisit
without asking).

A 9th feature, **Fuel**, was added after the original 8 (no feature doc —
built directly off user instruction, following the same
repository/service/router + page/api/types pattern as every other
feature). See "Backend architecture"/"Frontend architecture" below for its
shape; every field beyond `car_id`/`cost` is an **(added)**/**(assumption)**
choice made to satisfy the user's stated purpose ("track fuel consumption"
+ "cost management"), not from a written spec — worth confirming with the
user before extending it further.

A 10th feature, **Enrollment**, replaced `vendors.monthly_fare` and
`cars.vendor_id` (also no feature doc, same built-directly-off-user-
instruction basis as Fuel). The original model had a single static fare per
vendor and a bare "current vendor" FK on Car with no dates; the user's real
need was that a vendor leases specific cars for *dated periods* at a
per-period fare, and a returned car should have a gap where no fare accrues
until it's re-leased. `cars.vendor_id` is gone entirely — "current vendor
for a car" is now derived by looking up the Enrollment for that car with
`end_date IS NULL`. See "Backend architecture"/"Frontend architecture"
below for the full shape.

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

## Backend architecture

The backend is organized **feature-first**, not by technical layer: each
domain from `.claude/.rules/features/` gets its own package under
`app/features/<feature>/` containing everything specific to it. Only truly
cross-cutting infrastructure lives outside `app/features/`.

- `app/core/config.py` — `pydantic-settings` reading `DATABASE_URL`,
  `ENVIRONMENT`, `ALLOW_ORIGINS`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`,
  `ACCESS_TOKEN_EXPIRE_MINUTES` from `.env`.
- `app/core/security.py` — generic, feature-agnostic crypto helpers:
  password hashing/verification (`bcrypt` directly — **not** `passlib`,
  which is unmaintained and broken with `bcrypt>=4.1`, see below) and JWT
  creation/decoding (`python-jose`).
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
- Each feature package follows a **repository → service → router**
  layering — every feature (including Maintenance, Car Docs, and Payment)
  follows this template:
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
  against `app.features.enrollments.models.Enrollment.vendor_id` (any row,
  not just an active one) rather than `Car` directly, since a vendor's
  relationship to cars is now only through Enrollment — see the
  `app/features/enrollments/` bullet below. Vendor has **no fare field of
  its own** anymore; `monthly_fare` lives on Enrollment (dropped from
  `vendors` in migration `0015`, see "Project state"). `CarService.delete()`
  applies the same referenced-check pattern in the other direction, checking
  `MaintenanceRecord`/`CarDoc`/`Payment`/`FuelRecord`/`Enrollment` for any
  row whose `car_id` points at the car being deleted.
- `app/features/cars/` — the hub entity, with FKs to `car_owners`
  (`owner_id`, required) and `drivers` (`driver_id`, optional). **No
  `vendor_id`** — dropped in migration `0014` (see "Project state"); a car's
  current vendor is derived by looking up its Enrollment with `end_date IS
  NULL`, not stored on the car itself. `CarService` takes the Car Owner and
  Driver repositories as constructor args (see `get_car_service`, no longer
  takes a `VendorRepository`) and validates: `model_year` is in `[1980,
  current_year + 1]`; `engine_number`/`chassis_number` are unique
  (`ConflictException`, checked via
  `CarRepository.get_by_engine_number`/`get_by_chassis_number`); and that
  `owner_id`/`driver_id` reference rows that actually exist
  (`NotFoundException`) — reuse this
  validate-references-via-sibling-repository approach for any future
  feature that takes a foreign key as user input. There is a single `PUT`
  endpoint (not a separate reassignment `PATCH`) since `CarUpdate` already
  makes every field optional and applies via `exclude_unset` — same
  convention as `car_owners`. No pagination/filtering on `GET /cars` yet,
  matching `car_owners`' current (also not-yet-implemented) state.
- `app/features/maintenance/` and `app/features/car_docs/` — car-scoped
  records, both required FK `car_id` → `cars.id` validated via
  `CarRepository`. `MaintenanceService` validates `type` against a fixed
  tuple (`service`/`battery`/`tyre`/`spare_parts`/`engine_oil`) and
  `cost >= 0`; `CarDocService` validates `cost >= 0` only (`expiry_date` is
  a plain `date`, no enum). Both routers' `GET /` accepts filter query
  params (`car_id`, plus `type` for Maintenance and
  `name`/`expiring_before` for Car Docs) — unlike `cars`/`car_owners`,
  these were built with filtering from the start since the feature docs
  call for it explicitly. Both services' `delete()` block with
  `ConflictException` if a `Payment` row references them via
  `associated_maintenance`/`associated_cardocs` (imported inline inside
  the method, not at module level, to avoid a circular import with
  `app.features.payments.service` which imports these two features'
  repositories).
- `app/features/fuel/` — the 9th feature (see "Project state"), car-scoped
  like Maintenance/Car Docs: required FK `car_id` → `cars.id` validated via
  `CarRepository`. Fields beyond `car_id` are all **(added)**: `fuel_type`
  (fixed tuple `octane`/`petrol`/`diesel`/`cng`/`other`, validated like
  Maintenance's `type`), `quantity_liters` (`>= 0`, the consumption-tracking
  half of the feature), `cost` (`>= 0`, the cost-management half),
  `odometer_reading` (optional, `>= 0` when present — not used for any
  computed mileage/efficiency yet, just stored for a future consumption-rate
  feature), `fuel_station`, `fuel_date` (required `date`, mirroring
  Payment's `payment_date` rather than Maintenance's plain
  `created_at`, since cost management over time needs a real transaction
  date, not just row-creation time), and optional `description`. `GET /`
  filters by `car_id`, `fuel_type`, and `date_from`/`date_to` over
  `fuel_date` (same pattern as Payments). `FuelService.delete()` blocks
  with `ConflictException` if a `Payment` row references it via
  `associated_fuel` (imported inline inside the method, same
  avoid-a-circular-import reasoning as Maintenance/Car Docs' delete()
  below) — added once Payments grew an `associated_fuel` FK (see below);
  `CarService.delete()` also still blocks deleting a car with fuel
  records, same as it does for Maintenance/Car Docs/Payment.
- `app/features/enrollments/` — the 10th feature (see "Project state"), a
  dated car↔vendor lease period: required FKs `car_id` → `cars.id` and
  `vendor_id` → `vendors.id`, plus `monthly_fare` (`>= 0`, **(added)**,
  lives here rather than on Vendor or Car specifically so a re-lease at a
  renegotiated rate doesn't overwrite history), `start_date` (required),
  `end_date` (nullable — **null means the lease is currently active**,
  setting it is how a car is "returned"). `EnrollmentService.create()`
  rejects with `ConflictException` if the car already has an active
  (`end_date IS NULL`) enrollment — only one active lease per car; ending
  the current one (via `PUT {"end_date": ...}`) is required before starting
  another. `update()` re-checks the same invariant if an edit would clear
  `end_date` back to active. `delete()` blocks with `ConflictException` if a
  `Payment` references it via `associated_enrollment` (inline import, same
  avoid-circular-import reasoning as Fuel/Maintenance/Car Docs).
  `GET /enrollments` filters by `car_id`, `vendor_id`, `active`. Two extra
  endpoints exist because rent isn't auto-generated (no scheduler/cron in
  this app — user's explicit call): `GET /{id}/due-payments` walks months
  from `start_date` to `min(end_date or today, today)` and buckets each into
  `due_months`/`generated_months` by checking for an existing `Payment` with
  `associated_enrollment == id` in that month; `POST
  /{id}/generate-payments` bulk-creates a `monthly_fair` Payment (linked via
  `associated_enrollment`) for every due month in one call, `paid_by` = the
  vendor's name, `paid_to` = the car owner's name. Because due-months are
  computed per-enrollment-record, a gap between one enrollment ending and
  the next starting for the same car naturally has no due months — this is
  what satisfies "no fare while the car sat idle," don't reintroduce a
  synced `cars.vendor_id`/cron-based alternative without re-confirming with
  the user (see "Project state").
- `app/features/payments/` — the money-movement ledger. Required FKs:
  `car_id` → `cars.id`; optional FKs: `associated_maintenance` →
  `maintenance_records.id`, `associated_cardocs` → `car_docs.id`,
  `associated_fuel` → `fuel_records.id` (added in migration `0012`, after
  Fuel was already live, mirroring the Maintenance/Car Docs linkage
  pattern exactly — user's explicit call, see "Project state"),
  `associated_enrollment` → `enrollments.id` (added in migration `0016`,
  same pattern again). `PaymentService` validates `type`
  (`service`/`document`/`fuel`/`monthly_fair`/`other`), that
  `associated_maintenance` is only set when `type == "service"`,
  `associated_cardocs` only when `type == "document"`, `associated_fuel`
  only when `type == "fuel"` (all three optional even for their matching
  type — a payment may exist without a formal linked record), and that
  every referenced id actually exists (`NotFoundException`, via
  `CarRepository`/`MaintenanceRepository`/`CarDocRepository`/
  `FuelRepository`/`EnrollmentRepository`). `associated_enrollment` is
  different: it's **required, not optional, whenever `type ==
  "monthly_fair"`** (`ValidationException` if missing — user's explicit
  call, a `monthly_fair` payment must always trace back to a real lease
  period), and when it's set, `amount` is **not** taken from the request at
  all — `PaymentService.create()`/`update()` silently overwrite `amount`
  with that Enrollment's `monthly_fare` every time (looked up via
  `EnrollmentRepository`), so a `monthly_fair` payment's amount can never
  drift from its linked enrollment's rate; `amount` stays a manually-entered
  required field (validated `>= 0`) only for the other four types. This
  mirrors `EnrollmentService.generate_due_payments()`'s existing
  amount-from-enrollment behavior (see the `enrollments` bullet above) —
  don't reintroduce a manual `Amount` input for `monthly_fair` payments
  without re-confirming with the user. **Maintenance/Car Docs/Fuel do
  not auto-create a Payment row** — flagged as an open question in
  `05-maintenance.md`/`07-payment.md` and resolved as manual for
  Maintenance/Car Docs (see "Project state"); Fuel's linkage was added
  later under the same manual-only rule, re-confirmed with the user
  rather than assumed; Enrollment's linkage is also manual — the *bulk*
  "generate due payments" action is still a user-triggered click, not a
  scheduler. Don't add auto-creation without re-confirming with
  the user first. `GET /payments` filters by `car_id`, `type`, and a
  `date_from`/`date_to` range over `payment_date`.
- `app/features/revenue/` — read-only, **no `models.py`/`migration`**:
  `RevenueService.get_summary()` takes the same `car_id`/date-range filters
  as Payments (via `PaymentRepository.list_all()`), fetches the matching
  Payment rows, and aggregates them in Python (not SQL) into
  `total_income`/`total_expense`/`net_revenue`, a `by_type` breakdown, a
  `by_period` breakdown (grouped by `payment_date.strftime("%Y-%m")`), and
  a `by_car` breakdown that's `null` whenever a single `car_id` is
  filtered (comparing cars only makes sense when not already scoped to
  one). `type == "monthly_fair"` is income; every other type is expense —
  `INCOME_TYPE` constant in `service.py` is the single source of truth for
  that split, don't duplicate the check. This means `fuel`-type Payments
  count as expense automatically, with no change needed in this file —
  that's why Fuel cost only affects the Revenue dashboard once a Payment
  row (optionally linked via `associated_fuel`) is created for it, not
  directly from `fuel_records`. Mounted at `GET /api/v1/revenue` with
  `from`/`to` query param aliases (`Query(alias="from")` — `from` is a
  Python keyword) rather than `date_from`/`date_to`, matching the exact
  param names in `08-revenue.md`.
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
  `app.features.fuel.models`, `app.features.enrollments.models`) so its
  tables register on `Base.metadata` before migrations run — add the new
  import there too when adding a feature. Migrations `0006`–`0008` create
  `maintenance_records`/`car_docs`/`payments` in that order (FK
  dependency order: `payments` references both `maintenance_records` and
  `car_docs`); `revenue` has no migration since it has no table. `0011`
  creates `fuel_records` (only FK is `car_id` → `cars.id`, so no
  dependency ordering concern like `payments` had). `0012` adds
  `payments.associated_fuel` (nullable FK → `fuel_records.id`) after the
  fact, once Payments needed to optionally link to Fuel too — a plain
  `add_column`/`drop_column` pair, not a new table, so it didn't need a
  new `alembic/env.py` model import. `0013` creates `enrollments` (FKs to
  both `cars.id` and `vendors.id`); `0014` drops `cars.vendor_id` and
  `0015` drops `vendors.monthly_fare` — both now redundant once Enrollment
  is the source of truth for the car↔vendor relationship and its fare (see
  "Project state"); `0016` adds `payments.associated_enrollment`, same
  add-column shape as `0012`. `0013` must precede `0016` since Payments'
  new FK targets the `enrollments` table.

**Known environment quirk:** this venv is Python 3.14 (very new). Standard
`passlib[bcrypt]` fails at runtime here (`AttributeError: module 'bcrypt'
has no attribute '__about__'`) because passlib is unmaintained and doesn't
support modern `bcrypt`. Use the `bcrypt` package's `hashpw`/`checkpw`
directly instead, as `app/core/security.py` already does — don't
reintroduce `passlib`.

## Frontend architecture

Run from `frontend/`: `npm run dev` (Vite dev server), `npm run build`
(`tsc -b && vite build`), `npm run lint` (`oxlint`). `VITE_API_URL`
(`.env`, default `http://localhost:8000/api/v1`) points at the backend.

The frontend is **feature-first** too, mirroring the backend split — each
business entity gets a page, an API module, and (if it needs more than
primitive fields) a types file. `app/features/car_owners/` on the backend
maps to `src/pages/CarOwnersPage.tsx` + `src/api/carOwners.ts` +
`src/types/carOwner.ts` on the frontend; `vendors`/`drivers`/`cars`/
`maintenance`/`car_docs`/`payments`/`fuel`/`enrollments` all follow the same
layout (`VendorsPage.tsx`/`DriversPage.tsx`/`CarsPage.tsx`/
`MaintenancePage.tsx`/`CarDocsPage.tsx`/`PaymentsPage.tsx`/`FuelPage.tsx`/
`EnrollmentsPage.tsx` + matching `api/`/`types/` modules); `FuelPage.tsx` at
`/fuel` (nav entry between Maintenance and Car Docs) is copied directly from
`MaintenancePage.tsx`'s modal-form/data-table/view-modal structure, and
`EnrollmentsPage.tsx` at `/enrollments` (nav entry between Cars and Vendors)
is likewise copied from `FuelPage.tsx`'s structure, with one addition: its
view modal fetches `GET /enrollments/{id}/due-payments` on open and renders
a small "Payment status" section (`due_months`/`generated_months`) with a
"Generate due payments" button when `due_months` is non-empty — a light
addition inside the existing view-modal shell, not a new page section, same
restraint as `CarDocsPage.tsx`'s `.expired` styling below. Its create form
only lets `car_id`/`vendor_id` be chosen when creating a new enrollment
(`editingId` is falsy); editing an existing one shows them as read-only text
instead, since `EnrollmentUpdate` on the backend doesn't accept those two
fields — reassigning a car to a different vendor means ending the current
enrollment and creating a new one, not editing one in place.
Revenue is the one exception, since it's a read-only dashboard rather than
a CRUD resource: it's `src/pages/DashboardPage.tsx` (mounted at the
existing `/dashboard` route/nav entry, not a new `/revenue` route) +
`src/api/revenue.ts` + `src/types/revenue.ts`, and its filter controls
(`car_id`/`from`/`to`, mapping to `GET /revenue`'s query params) sit in
`.page-header`'s right-hand slot in place of the usual `.btn-primary`
create button, since there's nothing to create.

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
  right (shared `.form-field`/`.form-field-label` classes in `App.css`).
  Wrapping the control in `<label>` gives it its accessible name natively,
  so no separate `aria-label` is needed. `placeholder` is reserved for a
  format example on top of the label (e.g. `e.g. 1500.00` on a cost/amount
  field), not as a stand-in for the label itself — don't go back to
  placeholder-only fields with no visible label (that read as ambiguous
  once a select showed "Unassigned" or a number field showed a filled-in
  default with nothing beside it explaining what it was; fixed across
  every feature's create/edit modal in one pass, user's explicit call).
  `AuthForm.css`'s login/register forms predate this convention and use
  their own visible-label markup; don't backport this exact `.form-field`
  structure onto those two pages without being asked, but they already
  satisfy the same "field must have a visible label" intent. Footer
  actions use the shared `.modal-actions` class
  (`justify-content: space-between`):
  **Cancel/Close bottom-left**, primary action (`.btn-primary`)
  **bottom-right**. A read-only "view" modal (opened from the table's
  `ViewIcon`) reuses the same `.modal-backdrop`/`.modal-panel.card` shell
  with a `<dl className="detail-list">` (shared in `App.css`) instead of
  form inputs — see `CarOwnersPage.tsx`'s `viewingOwner` modal.
- `.modal-panel` also styles bare `select`/`textarea` elements the same as
  `input` (added for Vendor/Driver's `address` textarea and Car's
  owner/driver `select`s) — reuse these rather than styling a
  one-off. For a feature whose form needs to pick another feature's record
  (like Car picking a Car Owner/Driver, or Enrollment picking a Car/Vendor),
  fetch that sibling feature's list in the same page-load `Promise.all` as
  the page's own list (see `CarsPage.tsx`), use it to populate the
  `<select>` options in the form, and reuse it again to resolve id → name
  for display in the table and view modal (there's no expanded/joined read
  from the API — `CarRead` only carries the raw FK ids). Car specifically
  is picked by five sibling features (Maintenance, Car Docs, Payments,
  Fuel, Enrollments), all of which display it via the shared
  `carDisplayLabel(car)` helper exported from `src/types/car.ts` — brand +
  model, plus the last 4 digits of `registration_number` in parens when
  present (e.g. `Toyota Corolla (4321)`), so cars sharing a brand/model are
  still easy to tell apart in a select or table. This is the one
  cross-page-shared (not copy-pasted-per-page) display helper in the
  frontend, since it has 10 call sites across 5 files and a single source
  of truth was worth it; don't reintroduce a local per-page
  `${car.brand} ${car.model_name ?? ''}` duplicate — import and use
  `carDisplayLabel` instead. Each of those 5 pages' own local
  `carLabel(carId)` helper still does the `cars.find` id lookup, then
  delegates formatting to `carDisplayLabel`. `CarsPage.tsx`'s own
  `vendorName(carId)` helper (no `Vendor` FK left on `Car` to look up
  directly) instead finds the active enrollment for that car id in a
  `listEnrollments({ active: true })` list fetched alongside cars/owners/
  vendors/drivers, then resolves that enrollment's `vendor_id` to a name —
  the one car-related lookup here that goes through a second sibling
  feature (Enrollment) rather than a direct FK on `Car`.
- `NavIcons.tsx` holds every icon as a small inline-SVG component built
  from the shared `iconProps()` helper (24×24 viewBox, `stroke="currentColor"`,
  `strokeWidth="1.5"`) — add new icons here (e.g. `PlusIcon`) rather than
  inlining SVG in a page.
- Auth/session state lives in `src/store/authStore.ts` (zustand), not
  per-page state — feature pages only hold their own list/form/loading
  state locally with `useState`, matching `CarOwnersPage.tsx`.
- `PaymentsPage.tsx`'s form conditionally renders the `associated_maintenance`
  select only when `type === 'service'`, `associated_cardocs` only when
  `type === 'document'`, `associated_fuel` only when `type === 'fuel'`, and
  `associated_enrollment` only when `type === 'monthly_fair'` (mirroring
  the backend's validation), clearing the other three whenever `type`
  changes (`handleTypeChange`); all four selects filter their options down
  to the currently-selected `car_id` when one is chosen. Reuse this
  conditional-field-by-type pattern for any future feature whose form
  fields depend on a sibling `type`/enum field. The page fetches
  `listFuelRecords()` and `listEnrollments()` in the same page-load
  `Promise.all` as cars/maintenance/car docs, and labels a fuel option via
  a local `fuelRecordLabel(record)` (`${fuel type label} — ${fuel_station}`)
  and an enrollment option via `enrollmentRecordLabel(enrollment)`
  (`${vendor name} — ${monthly_fare}/mo`), matching
  `maintenanceRecordLabel`/`carDocRecordLabel`'s one-line-identifying-string
  shape. Unlike the other three, `associated_enrollment` is `required` on
  its `<select>` (no "no linked enrollment" empty option), matching backend
  validation now requiring it for `monthly_fair`; the manual `Amount`
  `<input>` is hidden outright (not shown read-only) whenever `type ===
  'monthly_fair'`, since `PaymentService` derives and overwrites `amount`
  from the linked Enrollment server-side regardless of what's submitted —
  user's explicit call, don't reintroduce it without asking.
- `CarDocsPage.tsx` colors an already-past `expiry_date` cell with
  `.expired` (`var(--status-critical)`, defined in the page's own CSS
  file rather than `App.css` since no other feature needs it yet) — a
  light touch on top of the standard table, not a full "expiring soon"
  filter/reminder system (that's flagged as suggested-not-required in
  `06-car-docs.md`; ask before building it out further).
- `DashboardPage.tsx` (the Revenue dashboard) has **no chart library
  dependency** — `package.json` intentionally stays at
  `react`/`react-router-dom`/`zustand` only, so the by-type donut and
  by-period grouped bar chart are hand-rolled inline SVG (`<circle
  strokeDasharray>` arcs for the donut, `<rect>` bars for the bar chart),
  colored from the categorical palette in
  `.claude/skills` → dataviz's `references/palette.md` (validated via that
  skill's `scripts/validate_palette.js`) rather than the app's single
  `--accent` token, since this is the app's first multi-series
  visualization. If a future feature needs another chart, reuse this
  hand-rolled-SVG approach rather than introducing a chart library without
  checking with the user first.

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
dated lease tracked by **Enrollment** (`car_id` + `vendor_id` +
`monthly_fare` + `start_date`/`end_date`, `end_date IS NULL` meaning
currently active) rather than a bare FK on `cars` — a vendor leases
specific cars for specific periods at a per-period fare, and a returned car
has a gap where no fare accrues until it's re-leased. **Maintenance** and
**Car Docs** are car-scoped records for servicing and document tracking
respectively. **Payment** is the single ledger of all money movements for a
car (`type`: `service`, `document`, `fuel`, `monthly_fair`, `other`),
optionally linked back to the Maintenance/CarDocs/Fuel record that
generated it — except `monthly_fair`, whose link to an Enrollment is
**mandatory**, and whose `amount` is always derived from that Enrollment's
`monthly_fare` rather than entered by hand. **Revenue** has no table of its
own — it is a dashboard computed on the fly from Payment records:
`monthly_fair` payments count as income, every other type is deducted as
expense. None of this connects to **Auth** — `users` is an isolated login
identity gating access to the whole API; there's no ownership/role model.

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