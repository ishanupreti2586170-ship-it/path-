---
name: Per-attempt payment scoping
description: How to enforce "one payment unlocks one test attempt" for a paywall on a no-login app
---

When a paywall must gate a single attempt/session of a flow (not the browser
forever), tie the paid-unlock id to that specific attempt rather than a
persistent visitor id.

**Why:** A persistent id stored in localStorage (created once per browser)
lets a single payment unlock every future retake indefinitely, which breaks
"one payment per attempt" pricing. Retakes need their own fresh id so a new
payment is required each time.

**How to apply:**
- Generate the id fresh at the moment the attempt starts (not on first page
  load), and store it in `sessionStorage` (survives an external redirect to
  a payment provider and back in the same tab) instead of `localStorage`
  (persists across all future visits/attempts).
- Pass that id as the payment provider's reference/metadata field (e.g.
  Stripe `client_reference_id`) so unlock-status lookups key off it.
- Clear any "unlocked" flag and generate a new attempt id whenever the user
  starts a new attempt, so a prior payment can't silently carry over.
