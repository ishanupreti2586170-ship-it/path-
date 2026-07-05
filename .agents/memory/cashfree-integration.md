---
name: Cashfree PG integration
description: Non-obvious gotchas when wiring Cashfree Payment Gateway (India) into a no-account paywall app.
---

# Cashfree PG integration

Provider used for the one-time report unlock (INR). India-friendly alternative to
Stripe (which needed a referral code for this account).

## Key ↔ environment must match (most common failure)
Cashfree returns a generic `{"error":"authentication Failed"}` when the API
**endpoint mode does not match the credential type**, NOT only when keys are wrong.
- Secret key prefix tells you the mode: `cfsk_ma_test_...` = SANDBOX, `cfsk_ma_prod_...` = PRODUCTION.
- The SDK env (`new Cashfree(CFEnvironment.SANDBOX|PRODUCTION, ...)`) must match the key type.
**Why:** we burned time thinking prod keys were invalid — they were valid, just being sent to the sandbox endpoint.
**How to apply:** before debugging deeper, check the secret prefix vs the configured env. Env driven by `CASHFREE_ENV` (sandbox|production).

## Watch for header-name-shaped junk in secrets
Symptom of a bad paste: values that look like `x-client-id` / `x-partner...` (Cashfree
doc header names) instead of real credentials. Real App ID is a longer opaque string;
secret starts with `cfsk_ma_`. If a secret has whitespace or reads like a header name, ask for a re-paste.

## order_id = per-attempt id (idempotent checkout)
`order_id` must be globally unique per order. We set `order_id = testSessionId` (the
per-attempt UUID). On a repeat unlock click for the same attempt, do NOT blindly
`PGCreateOrder` — Cashfree rejects duplicate order_id. Instead `PGFetchOrder` first:
PAID → return alreadyPaid; ACTIVE → reuse its `payment_session_id`; 404 → create.

## Paywall truth is server-side only
Never trust a client-side unlock flag (e.g. sessionStorage) as authority — always
verify via order status on load and clear the local flag on a definitive "not paid".
Local flag is a UX cache to avoid a flash, nothing more.
**Why:** a forged `co_unlocked=1` bypassed the paywall until we made the client re-verify every load.
