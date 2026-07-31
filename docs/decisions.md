# Design decisions & history

This doc holds the "why" behind choices in this codebase — naming history,
rationale for features that shipped without a written spec, and narration
of how the schema got to its current shape. `CLAUDE.md` holds the current
state and actionable conventions; this file is for context that's useful
when you need it but doesn't need to be re-read on every task. Not
auto-loaded — read it on demand when a decision here seems relevant.

## Fuel feature (9th feature, no feature doc)

Added directly off user instruction, following the same
repository/service/router + page/api/types pattern as every other feature.
Every field beyond `car_id`/`cost` (`fuel_type`, `quantity_liters`,
`odometer_reading`, `fuel_station`, `fuel_date`, `description`) is an
**(added)**/**(assumption)** choice made to satisfy the user's stated
purpose ("track fuel consumption" + "cost management"), not from a written
spec — worth confirming with the user before extending it further (e.g.
before building a mileage/efficiency feature off `odometer_reading`, which
is currently stored but unused for any computation).

## Lease feature (10th feature, replaced `vendors.monthly_fare` + `cars.vendor_id`)

Also no feature doc, same built-directly-off-user-instruction basis as
Fuel. The original model had a single static fare per vendor and a bare
"current vendor" FK on Car with no dates. The user's real need was that a
vendor leases specific cars for *dated periods* at a per-period fare, and a
returned car should have a gap where no fare accrues until it's re-leased.
`cars.vendor_id` is gone entirely — "current vendor for a car" is now
derived by looking up the Lease for that car with `end_date IS NULL`.

**Naming history:** this feature was originally built and shipped as
"Enrollment" (`app/features/enrollments/`, table `enrollments`,
`associated_enrollment` on Payment, nav label "Enrollments") — the word
didn't fit a car-leasing domain, so everything was renamed to "Lease"
shortly after (user's explicit call). The rename touched the backend
package/model/table/column/routes, the frontend page/types/api
module/nav entry, and the frontend equivalents
(`EnrollmentsPage.tsx` → `LeasesPage.tsx`, `/enrollments` → `/leases`,
`api/enrollments.ts` → `api/leases.ts`, `types/enrollment.ts` →
`types/lease.ts`). Migration `0017` is the actual DB rename (`enrollments`
→ `leases` table, `associated_enrollment` → `associated_lease` column, plus
indexes/constraints) — migrations `0013` through `0016` still say
"enrollment" in their filenames/content because that was the accurate name
*at the time* they ran; don't rewrite migration history to pretend the
name was always "Lease".

## Migration history narrative (`0006`–`0017`)

Migrations `0006`–`0008` create `maintenance_records`/`car_docs`/`payments`
in that order (FK dependency order: `payments` references both
`maintenance_records` and `car_docs`); `revenue` has no migration since it
has no table. `0011` creates `fuel_records` (only FK is `car_id` →
`cars.id`, no dependency ordering concern like `payments` had). `0012` adds
`payments.associated_fuel` (nullable FK → `fuel_records.id`) after the
fact, once Payments needed to optionally link to Fuel too — a plain
`add_column`/`drop_column` pair, not a new table. `0013` creates
`enrollments` (FKs to both `cars.id` and `vendors.id`); `0014` drops
`cars.vendor_id` and `0015` drops `vendors.monthly_fare` — both redundant
once Lease became the source of truth for the car↔vendor relationship and
its fare. `0016` adds `payments.associated_enrollment`, same add-column
shape as `0012`; `0013` had to precede it since the new FK targets the
`enrollments` table. `0017` renames `enrollments` → `leases` and
`associated_enrollment` → `associated_lease` (the rename described above).

## Payment auto-creation: resolved as manual, not automatic

Maintenance and Car Docs do **not** auto-create their linked Payment row —
that was an open question in the original feature docs (`05-maintenance.md`
/`07-payment.md`), resolved as: Payments are created manually/independently
on the Payments page, matching the plain-CRUD pattern of every other
feature (user's explicit call). Fuel's Payment linkage (`associated_fuel`)
was added later under the same manual-only rule, re-confirmed with the
user rather than assumed. Lease's linkage is also manual — the *bulk*
"generate due payments" action (`POST /{id}/generate-payments`) is a
user-triggered click, not a scheduler. Don't add auto-creation for any of
these without re-confirming with the user first.

## Frontend form-field labeling: why placeholder-only fields were removed

Every form field was originally allowed to rely on `placeholder` text
alone in some places. This read as ambiguous once a `<select>` showed
"Unassigned" or a number field showed a filled-in default with nothing
beside it explaining what the field was. Fixed across every feature's
create/edit modal in one pass (user's explicit call) — every field is now
wrapped in a `<label className="form-field">` with a visible
`<span className="form-field-label">`, and `placeholder` is reserved for a
format example on top of the label, not a replacement for it. See
`CLAUDE.md`'s Frontend architecture section for the current convention.

## Dark theme + dialog redesign: ported from `number-nest`

The user pointed at a sibling project, `number-nest` (a different app in
the same monorepo family), where dark theme support and a redesigned
error/confirm dialog pair had already shipped, and asked for the same
treatment here. Rather than invent a new design, the tokens, components,
and interaction patterns were ported near-verbatim from `number-nest`'s
`src/index.css`, `src/store/themeStore.ts`, `src/components/ThemeToggle.tsx`,
`ErrorDialog.tsx`/`.css`, and `ConfirmDialog.tsx`/`.css`, then adapted to
this app's existing token names and orange accent (`number-nest` uses
blue) instead of introducing a second design language. `Loader.tsx`
initially shipped as a hand-rolled CSS spinner to avoid adding a
dependency, but the user explicitly asked for `react-loader-spinner`'s
`BallTriangle` (the same package `number-nest` uses, just a different
component — `number-nest` uses `DNA`) — `Loader.tsx` now wraps
`BallTriangle` at the same `^8.0.2` version instead. See `CLAUDE.md`'s
Frontend architecture section (Dark theme / Confirm dialog bullets) for
the resulting conventions. This also replaced every page's
`window.confirm` delete confirmation with the new `ConfirmDialog` — that
swap wasn't present in any feature doc, it fell out naturally from
redesigning the dialog pair.

## Dashboard: why no chart library

`DashboardPage.tsx` (the Revenue dashboard) was the app's first
multi-series visualization. `package.json` intentionally stays at
`react`/`react-router-dom`/`zustand` only, so the by-type donut and
by-period grouped bar chart are hand-rolled inline SVG rather than pulling
in a charting library. If a future feature needs another chart, reuse this
hand-rolled-SVG approach rather than introducing a chart library without
checking with the user first.
