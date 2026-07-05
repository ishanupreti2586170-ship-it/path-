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
    const { visitorId, origin } = req.body || {};
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

    const baseUrl = origin || `${req.protocol}://${req.get("host")}`;
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
// have landed yet.
router.get("/verify-session", async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "session_id is required" });
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({
      unlocked: session.payment_status === "paid",
      visitorId: session.client_reference_id,
    });
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
