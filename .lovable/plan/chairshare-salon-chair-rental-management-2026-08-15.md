# ChairShare — Salon Chair Rental Management

A platform where salon owners manage chair renters, collect and track rent, and handle rental agreements. Two roles with separate experiences: **salon owner** and **chair renter**.

## Look and feel

Fresh and relaxing: soft off-white canvas, sage/eucalyptus green as the primary accent, warm sand secondary, deep slate text. Generous whitespace, rounded cards, soft shadows, calm micro-transitions. Clean geometric sans for headings with a highly readable body face. No harsh reds — overdue states use a muted clay tone.

## Roles and access

- **Owner**: manages the salon, chairs, renters, rent schedules, agreements, and sees payment history.
- **Renter**: sees their chair, rent due, payment history, pays by card, and signs agreements.
- Roles live in a dedicated roles table (never on the profile) and are enforced server-side.

## Core features

### 1. Onboarding and invites
- Sign up / sign in with email + password.
- First owner sign-up creates their salon.
- Owner invites a renter by email; the invite generates a unique link. The renter signs up through it and is automatically attached to the salon as a renter.
- Invite states: pending, accepted, revoked, expired.

### 2. Chairs / stations
- Owner creates chairs (name/number, description, rent amount, billing cycle: weekly or monthly).
- Assign a chair to a renter, unassign, mark vacant.
- Salon dashboard shows chair occupancy at a glance.

### 3. Rent and payments (Stripe)
- Rent charges are generated per chair assignment on its cycle, each with a due date.
- Renter pays by card through a hosted Stripe checkout; on success the charge is marked paid with the transaction recorded.
- Owner can also record an offline payment (cash / bank transfer) against a charge.
- Payment history for both sides, with running totals: paid this month, outstanding, overdue.
- Because Stripe is the merchant of record path for a service, we set up Stripe with tax calculation and collection so tax is computed at checkout; you handle registration and filing.

### 4. Agreements
- **Template e-signing**: owner picks or edits an agreement template (parties, chair, rent, cycle, term, house rules), sends it to a renter; renter reviews and signs by typing their name plus a drawn signature. We store the exact agreement text, signature, timestamp, and IP as an immutable signed record.
- **Uploads**: owner can upload an already-signed PDF/image against a renter, stored in secure file storage.
- Both sides can view and download their agreements. Signed records cannot be edited after signing.

### 5. Reminders and overdue flags
- Charges automatically flip to overdue past their due date, surfaced with counts on both dashboards.
- Scheduled daily job sends email reminders: upcoming rent (a few days before due) and overdue notices.

## Screens

- `/` — public landing page explaining the product, with sign-in / get-started.
- `/auth` — sign in, sign up, password reset.
- `/invite/:token` — renter accepts an invite and creates their account.
- **Owner**: dashboard (occupancy, money in, overdue), chairs, renters, payments, agreements, settings.
- **Renter**: dashboard (my chair, next rent due, pay now), payments history, my agreements.

## Technical notes

- Lovable Cloud for database, auth, storage, and scheduled jobs.
- Tables: `profiles`, `user_roles`, `salons`, `chairs`, `salon_members`, `invites`, `rent_charges`, `payments`, `agreement_templates`, `agreements`, `agreement_signatures`. Every table gets RLS scoped to the salon the user belongs to, plus explicit grants; renters can only ever read their own rows.
- Stripe via Lovable's built-in payments integration (test environment first — no real money until you verify the account). Checkout is created in a server function; a public webhook route verifies the signature and marks charges paid.
- Signature drawing on a canvas, stored as an image in secure storage alongside the frozen agreement text.
- Reminder emails via a scheduled job hitting a secured public endpoint.

## Build order

1. Cloud + schema, roles, RLS, auth pages, landing page.
2. Salons, chairs, renter invites, dashboards.
3. Rent schedule generation, Stripe checkout + webhook, payment history, offline payments.
4. Agreement templates, e-signing, uploads.
5. Overdue flags and reminder emails, polish pass.
