import { Router, type IRouter } from "express";
import { storage } from "./storage";
import { getUncachableStripeClient } from "./stripeClient";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Create a one-time checkout session to unlock the full report for a single
// test attempt. No accounts in this app -- testSessionId is a fresh id
// generated client-side each time someone starts the assessment, passed as
// client_reference_id so payment is tied to that one attempt (retaking the
// test generates a new testSessionId that requires a new payment). Email is
// required so Stripe can send a receipt and so we have a way to reach the
// buyer even though there's no login system.
router.post("/checkout", async (req, res) => {
  try {
    const { testSessionId, email } = req.body || {};
    if (!testSessionId || typeof testSessionId !== "string") {
      return res.status(400).json({ error: "testSessionId is required" });
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    const price = await storage.getFullReportPrice();
    if (!price) {
      return res.status(500).json({
        error:
          "The Full Report product isn't set up in Stripe yet. Run scripts/seed-products.ts first.",
      });
    }

    // Derive the base URL from trusted server-side request info only --
    // never trust a client-supplied origin/redirect target here, since that
    // would allow an open redirect through Stripe's success/cancel URLs.
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`;
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: testSessionId,
      customer_email: email,
      line_items: [{ price: price.priceId, quantity: 1 }],
      success_url: `${baseUrl}/?unlocked=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout session error:", error);
    res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
});

// Verify a specific checkout session immediately after redirect back from
// Stripe -- reads live from the Stripe API since the webhook sync may not
// have landed yet. Requires the caller's own testSessionId and enforces that
// it matches the session's client_reference_id, so a paid session ID
// belonging to someone else cannot be replayed to unlock a different attempt.
router.get("/verify-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const testSessionId = req.query.testSessionId;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "session_id is required" });
    }
    if (!testSessionId || typeof testSessionId !== "string") {
      return res.status(400).json({ error: "testSessionId is required" });
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const ownsSession = session.client_reference_id === testSessionId;
    const unlocked = ownsSession && session.payment_status === "paid";

    res.json({ unlocked });
  } catch (error: any) {
    console.error("Verify session error:", error);
    res.status(500).json({ error: error.message || "Failed to verify session" });
  }
});

// Revalidate unlock status for a test attempt from the Stripe-synced
// database -- used so a page refresh mid-session doesn't need to re-verify
// against the live Stripe API every time.
router.get("/purchase-status", async (req, res) => {
  try {
    const testSessionId = req.query.testSessionId;
    if (!testSessionId || typeof testSessionId !== "string") {
      return res.status(400).json({ error: "testSessionId is required" });
    }
    const unlocked = await storage.hasSessionPaid(testSessionId);
    res.json({ unlocked });
  } catch (error: any) {
    console.error("Purchase status error:", error);
    res.status(500).json({ error: error.message || "Failed to check purchase status" });
  }
});

export default router;
