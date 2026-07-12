# Feature: Auth (cross-cutting, not one of the 8 business features)

## Overview
A generic login identity, separate from every business entity (Car Owner,
Vendor, Driver, etc.). Whoever holds a valid JWT has full CRUD power over
all resources in the system — there is no role/permission system and no
per-record ownership scoping. This is the single gate in front of the app;
none of Car, Vendor, Driver, Car Owner, Maintenance, Car Docs, or Payment
have their own auth concept.

## Data Model — `users`
| Field         | Type          | Required | Notes |
|---------------|---------------|----------|-------|
| id            | uuid (PK)     | yes      | |
| email         | varchar       | yes      | unique, login identifier |
| password_hash | varchar       | yes      | bcrypt hash, never returned in API responses |
| created_at    | timestamptz   | yes      | |
| updated_at    | timestamptz   | yes      | |

No relationship to any business entity — `users` is intentionally isolated.

## API Endpoints
- `POST /api/v1/auth/register` — public. Body: `email`, `password`.
  Creates a `users` row (hashes password), returns the created profile (no
  `password_hash`).
- `POST /api/v1/auth/login` — public. OAuth2 password flow
  (`username` = email, `password`). Returns `{ access_token, token_type }`.
- `GET /api/v1/auth/me` — requires Bearer JWT. Returns the authenticated
  user's own profile.

Every other resource's endpoints depend on the same JWT (via
`get_current_user`) but do not otherwise reference `users` — see each
feature doc (e.g. [Car Owner](04-car-owner.md)) for its own endpoints.

## Business Rules & Validation
- `email` must be unique and a valid email format.
- `password` (plaintext, input-only) minimum length enforced at the API
  layer (8 chars); stored only as `password_hash` (`bcrypt`), never logged
  or returned.
- JWT: HS256, secret from env (`JWT_SECRET_KEY`), short-lived access token
  (default 60 min via `ACCESS_TOKEN_EXPIRE_MINUTES`). No refresh token for
  MVP — re-login when expired.
- No self-service registration gating (e.g. invite-only) — anyone who
  knows the API can create a `users` row via `/register`. Revisit if this
  needs to be locked down (e.g. remove the public register endpoint and
  seed users manually) once it's live.
