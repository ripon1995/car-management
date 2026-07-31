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

## Payment auto-creation: manual → automatic, plus a Paid/Unpaid status and the Income page (2026-08-01)

Maintenance and Car Docs originally did **not** auto-create their linked
Payment row — that was an open question in the original feature docs
(`05-maintenance.md`/`07-payment.md`), first resolved as: Payments are
created manually/independently on the Payments page, matching the
plain-CRUD pattern of every other feature (user's explicit call). Fuel's
Payment linkage (`associated_fuel`) was added later under the same
manual-only rule, re-confirmed with the user rather than assumed. Lease's
linkage was also manual — the *bulk* "generate due payments" action
(`POST /{id}/generate-payments`) was a user-triggered click surfaced
inside `LeasesPage.tsx`'s view modal, not a scheduler.

This was **reversed on 2026-08-01**, on direct user instruction: creating
a Maintenance/Car Docs/Fuel record now auto-creates its linked Payment,
and "Monthly fare" moved out of the Payments page entirely into a new,
frontend-only Income page. Reversing it required three follow-on design
decisions, each explicitly confirmed with the user rather than assumed
(the previous manual-only rule had been "don't change without
re-confirming," and the re-confirmation happened):

1. **A `status` column on `payments`** (`paid`/`unpaid`, migration
   `0018`). Without it, an auto-created payment would be indistinguishable
   from a real, already-happened money movement. Auto-created and
   lease-generated payments start `unpaid`; manually-created ones (and all
   pre-existing rows, via the migration's `server_default="paid"`) default
   to `paid`. A payment is flipped `paid` via a new shared
   `MarkPaidDialog.tsx` component, used from both `PaymentsPage.tsx` and
   the new `IncomePage.tsx`.
2. **Revenue went cash-basis.** Once `unpaid` payments could exist,
   whether they should count toward `total_income`/`total_expense`
   immediately (accrual) or only once actually paid (cash) was ambiguous
   and asked directly — the user chose cash-basis: `RevenueService.
   get_summary()` now filters to `status="paid"` before aggregating.
3. **The delete-block on Maintenance/Car Docs/Fuel had to change.**
   Before auto-creation, a record with *any* linked Payment couldn't be
   deleted (`ConflictException`) — a real invariant when Payments were
   opt-in. Once every new record *always* has a linked Payment, that rule
   would have made every Maintenance/Car Docs/Fuel record permanently
   undeletable unless its Payment was deleted first, every time. Flagged
   to the user before building, who chose: block deletion only when the
   linked Payment is already `paid` (real financial history); an `unpaid`
   linked payment (a pending stub) is deleted along with the record
   instead of blocking it.

The Income page (`IncomePage.tsx`, `/income`, nav entry between Leases and
Vendors) has **no backend feature package of its own** — no model, no
migration, no router. It's a computed view over the existing Lease
(`getDuePayments`/`generateDuePayments`) and Payment endpoints, replacing
the "Payment status" section that used to live inside `LeasesPage.tsx`'s
view modal (removed as part of this same change, per the user's explicit
"replace, don't supplement" call). See `CLAUDE.md`'s Backend/Frontend
architecture sections for the resulting conventions — this section is only
the "why."

**Follow-up, same day:** `paid_by` was further constrained to an enum —
`PAID_BY_METHODS = ("EBL", "DBBL", "UCB", "CASH")` — for every payment
type *except* `monthly_fair` (user's explicit call). `monthly_fair` was
left as free text since `paid_by` there is the vendor's name, populated
automatically by `generate_due_payments()`, not a payment-method choice a
person picks. Enforced in `PaymentService._validate_paid_by()` on both
`create()` and `update()`, and reflected in the frontend by swapping
`PaymentsPage.tsx`'s and `MarkPaidDialog.tsx`'s `paid_by` `<input>` for a
`<select>` whenever the payment's type isn't `monthly_fair`.

**Second follow-up, same day:** `monthly_fair` payments were removed from
`PaymentsPage.tsx` entirely (list, forms, view modal) — user's explicit
call, since the Income page already fully owns that type's lifecycle
(generate/mark-received) and showing it in two places was redundant/
confusing. No backend change was needed for this part (`GET /payments`
still returns every type; `PaymentsPage.tsx` just filters `type !==
'monthly_fair'` out of the fetched list client-side and drops
`monthly_fair` from its editable-type list and lease-related state/
fields). This also surfaced a real, pre-existing inconsistency in
`DashboardPage.tsx`: its filtered drill-down table computed a local net
total from `listPayments(...)` without a `status` filter, so an `unpaid`
row could count toward that local total while being excluded from the
top-line `summary.net_revenue` (which has been cash-basis, `status:
'paid'`-only, since the original status/auto-payment change above). Fixed
by adding `status: 'paid'` to that one `listPayments` call so both
numbers agree.

**Third follow-up, same day:** removing `monthly_fair` from
`PaymentsPage.tsx` (previous entry) meant there was no longer any UI to
view, edit, or delete a `monthly_fair` Payment at all — Income only had
"mark as received." User asked for View/Edit/Delete on Income too, so
that page now carries the full action set `PaymentsPage.tsx` has, scoped
to rows with a real `Payment` behind them (a synthetic not-yet-generated
row still only gets the single generate-then-mark action). Rather than
build a second status-editing form, `MarkPaidDialog.tsx` was extended
with an optional `title` prop and a `description` field, and reused for
Income's Edit action (`title="Edit payment"`) as well as its
mark-as-received action (`title="Mark as received"`) — same fields, same
save handler, just a different opening title depending on which icon was
clicked. Its `status` field now seeds from the target payment's actual
`status` instead of always defaulting to `'paid'`, since Edit (unlike
mark-as-received) shouldn't silently flip status just by opening.

**Fourth follow-up, same day:** two more adjustments, both user-requested.
First, "Mark received" moved out of `IncomePage.tsx`'s `Action` column
into its own dedicated column — it's the page's primary/most-frequent
action and the user wanted it visually distinct from View/Edit/Delete,
not bundled in as a fourth icon among them. Second, the popup that
opens for mark-as-received was simplified to only Status/Payment date/
Description — Amount/Car/Type/Paid by/Paid to don't need to be shown or
re-entered there, since `generate_due_payments()` already populates them
correctly (`paid_by`/`paid_to` = vendor/owner name) and the quick action
is just confirming receipt, not editing the record. This did **not**
extend to `PaymentsPage.tsx`'s own "mark as paid" action or to Income's
Edit action — both still need the full form, since `PaymentsPage.tsx`'s
auto-created service/document/fuel payments start with genuinely blank
`paid_by`/`paid_to` that must be filled in, and Edit is meant to allow
correcting any field, not just confirming receipt. Implemented as a
`simple?: boolean` prop on `MarkPaidDialog.tsx` (default `false`, full
form) rather than a second dialog component, since the fields shown are
a strict subset and the modal shell/keyboard/save-handler logic is
otherwise identical.

**Bug found while building the above, same day:** splitting "Mark
received" into its own column broke the table's layout — each row split
into two overlapping horizontal bands instead of rendering as one line.
Root cause, confirmed via `getBoundingClientRect()` in a live browser
session rather than guessed: `.data-table-actions` (used for every page's
Action column) sets `display: flex` directly on the `<td>`. That's
harmless with one such cell per row (every other page), but `IncomePage.tsx`
now has two (`Mark received` + `Action`) — with two flex `<td>`s in the
same row, the browser's table column-layout algorithm collapses both
cells onto the same column slot and stacks them vertically instead of
placing them side by side as separate columns. Fixed by keeping the `<td>`
as a normal table cell and moving the flex styling onto a child `<div
className="data-table-actions">` instead — worth remembering if a third
action-bearing column is ever added to any table in this app.

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
