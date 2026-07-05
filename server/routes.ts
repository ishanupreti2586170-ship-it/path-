import { Router, type IRouter } from "express";
import { storage } from "./storage";
import { getUncachableStripeClient } from "./stripeClient";

const router: IRouter = Router();

// Create a one-time checkout session to unlock the full report.
// No accounts in this app -- the anonymous visitorId (generated client-side
// and stored in localStorage) is passed as client_reference_id so we can
// look up payment status later from the Stripe-synced checkout_sessions table.
router.post("/checkout", async (req, res) => {
  try {
    const { visitorId } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") {
      return res.status(400).json({ error: "visitorId is required" });
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
      client_reference_id: visitorId,
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
// have landed yet. Requires the caller's own visitorId and enforces that it
// matches the session's client_reference_id, so a paid session ID belonging
// to someone else cannot be replayed to unlock this visitor's browser.
router.get("/verify-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    const visitorId = req.query.visitorId;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "session_id is required" });
    }
    if (!visitorId || typeof visitorId !== "string") {
      return res.status(400).json({ error: "visitorId is required" });
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const ownsSession = session.client_reference_id === visitorId;
    const unlocked = ownsSession && session.payment_status === "paid";

    res.json({ unlocked });
  } catch (error: any) {
    console.error("Verify session error:", error);
    res.status(500).json({ error: error.message || "Failed to verify session" });
  }
});

// Revalidate unlock status for a visitor from the Stripe-synced database --
// used so a returning visitor (same browser) doesn't need to pay again even
// if their localStorage flag was cleared.
router.get("/purchase-status", async (req, res) => {
  try {
    const visitorId = req.query.visitorId;
    if (!visitorId || typeof visitorId !== "string") {
      return res.status(400).json({ error: "visitorId is required" });
    }
    const unlocked = await storage.hasVisitorPaid(visitorId);
    res.json({ unlocked });
  } catch (error: any) {
    console.error("Purchase status error:", error);
    res.status(500).json({ error: error.message || "Failed to check purchase status" });
  }
});

export default router;
