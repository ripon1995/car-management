# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Backend is scaffolded (FastAPI app, Car Owner CRUD + separate Auth/User
JWT login). Frontend is still pre-code: only `frontend/.node-version`
(24.18.0) exists so far.

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
  as a template)

Dependencies are declared in `backend/pyproject.toml` (`pip install -e ".[dev]"`).

**Known Supabase gotcha:** the direct-connection host
(`db.<project-ref>.supabase.co`) often only resolves via IPv6, which fails
(`socket.gaierror`) on many networks. Use the **pooler** connection string
instead (`...pooler.supabase.com`, port `6543` transaction / `5432`
session), and remember to add `+asyncpg` to the scheme yourself — Supabase's
copy-paste string doesn't include it.

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
  layering — this is the template to copy for the remaining features (Car,
  Vendor, Driver, Maintenance, Car Docs, Payment):
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
  `app.features.auth.models`, `app.features.car_owners.models`) so its
  tables register on `Base.metadata` before migrations run — add the new
  import there too when adding a feature.

**Known environment quirk:** this venv is Python 3.14 (very new). Standard
`passlib[bcrypt]` fails at runtime here (`AttributeError: module 'bcrypt'
has no attribute '__about__'`) because passlib is unmaintained and doesn't
support modern `bcrypt`. Use the `bcrypt` package's `hashpw`/`checkpw`
directly instead, as `app/core/security.py` already does — don't
reintroduce `passlib`.

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

A **Car Owner** owns one or more **Cars**. Each Car is leased to a
**Vendor** (who pays a monthly fare) and has a **Driver** assigned to
operate it — both are current-assignment foreign keys on `cars`, not
history tables. **Maintenance** and **Car Docs** are car-scoped records for
servicing and document tracking respectively. **Payment** is the single
ledger of all money movements for a car (`type`: `service`, `document`,
`monthly_fair`, `other`), optionally linked back to the Maintenance or
CarDocs record that generated it. **Revenue** has no table of its own — it
is a dashboard computed on the fly from Payment records: `monthly_fair`
payments count as income, every other type is deducted as expense. None of
this connects to **Auth** — `users` is an isolated login identity gating
access to the whole API; there's no ownership/role model.

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