---
name: Stripe replit-sync gotchas
description: Two undocumented behaviors of the Replit Stripe connector + stripe-replit-sync package that silently break setup if missed.
---

**Connection settings field names**: the Replit Stripe connection's `settings` object exposes the secret key as `secret` and the publishable key as `publishable` — not `secret_key` / `publishable_key` as some skill templates assume. `webhook_secret` is named correctly. Always inspect the actual `/api/v2/connection` response shape rather than trusting a template's field names verbatim.

**Why:** the stripe skill's code-templates.md used `secret_key`/`publishable_key`, which silently resulted in `undefined` credentials.

**`syncBackfill()` with no arguments does nothing.** The library's internal default is `params ?? { object: this.getSupportedEventTypes }` — a bug where `getSupportedEventTypes` (a function reference, not its call result) is assigned as `object`. Since no `switch` case matches a function, the backfill silently syncs zero rows for every resource, but still logs success.

**Why:** discovered when Stripe products/prices created via a seed script never appeared in the synced `stripe.products`/`stripe.prices` tables — checkout then failed with "product not set up" despite the product existing in Stripe.

**How to apply:** always call `stripeSync.syncBackfill({ object: "all" })` explicitly on startup, never `syncBackfill()` bare. Verify sync actually populated rows by querying the `stripe.<resource>` tables directly, not just by trusting the "Sync complete" log line.
