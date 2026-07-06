---
name: Payment provider is Cashfree, not Stripe
description: The Career Oracle app's checkout/paywall is built on Cashfree; Stripe packages present in package.json are unused leftovers, not the live integration.
---

The live payment integration is Cashfree (`server/cashfreeClient.ts`, `server/routes.ts`:
`/api/checkout`, `/api/purchase-status`, `/api/restore-purchase`, `/api/payment-config`).
There is no webhook handler — the app relies on synchronous polling of Cashfree's order
status (`PGFetchOrder`) after redirect back from the hosted checkout page.

`stripe` and `stripe-replit-sync` still appear in `package.json` but are not wired into
any route. Don't assume Stripe artifacts (webhook handlers, `stripe.checkout_sessions`
table, Stripe test cards like 4242...) exist just because the packages are installed.

**Why:** A task described "confirm the flow with a real Stripe test card" but the
integration had already been migrated to Cashfree; the task's acceptance criteria
(webhook table, Stripe card numbers) were unmet for verifiable, unrelated reasons.

**How to apply:** Before doing anything payment-related, check `GET /api/payment-config`
to see the live mode ("sandbox" | "production") and confirm which provider's client
(`server/cashfreeClient.ts` vs any Stripe client) is actually imported in `routes.ts`.
If the mode is "production", a test card won't work — treat live-payment testing as
requiring explicit user sign-off (sandbox credentials or a real charge), not something
to trigger unprompted.
