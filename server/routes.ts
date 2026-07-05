import { Router, type IRouter } from "express";
import {
  getCashfreeClient,
  getFullReportPriceINR,
  isCashfreeProduction,
} from "./cashfreeClient";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cashfree requires a customer_phone on every order, but we no longer collect
// one from users. A fixed placeholder satisfies the API without asking for it.
const PLACEHOLDER_PHONE = "9999999999";

// A single "secret" email that unlocks the full report without paying (useful
// while the Cashfree domain whitelisting/approval is pending, or for the owner).
// Configured via BYPASS_EMAIL so the value stays server-side. Comma-separated
// is supported in case more than one address is ever needed.
function isBypassEmail(email: string): boolean {
  const configured = (process.env.BYPASS_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.length > 0 && configured.includes(email.trim().toLowerCase());
}

// Expose the current payment config the frontend needs: the price to show and
// which Cashfree mode ("sandbox" | "production") the checkout SDK must load.
router.get("/payment-config", (_req, res) => {
  res.json({
    priceInr: getFullReportPriceINR(),
    mode: isCashfreeProduction() ? "production" : "sandbox",
  });
});

// Create a Cashfree order to unlock the full report for a single test attempt.
// No accounts in this app -- testSessionId is a fresh id generated client-side
// each time someone starts the assessment, and we use it as the Cashfree
// order_id so payment is tied to that one attempt (retaking the test generates
// a new testSessionId, hence a new order and a new payment). Only the email is
// collected up front; Cashfree gets a placeholder phone.
//
// This MUST run server-side: creating an order uses the secret key, which must
// never be exposed to the browser.
router.post("/checkout", async (req, res) => {
  try {
    const { testSessionId, email } = req.body || {};
    if (!testSessionId || typeof testSessionId !== "string") {
      return res.status(400).json({ error: "testSessionId is required" });
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    // Secret email unlocks without going through Cashfree at all.
    if (isBypassEmail(email)) {
      return res.json({ alreadyPaid: true });
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`;

    const cashfree = getCashfreeClient();

    // A given attempt may already have an order (e.g. the user abandoned the
    // Cashfree page and clicked unlock again). order_id must be unique, so we
    // reuse the existing order instead of failing on a duplicate.
    try {
      const existing = await cashfree.PGFetchOrder(testSessionId);
      const status = existing.data?.order_status;
      if (status === "PAID") {
        return res.json({ alreadyPaid: true, orderId: testSessionId });
      }
      const existingSession = existing.data?.payment_session_id;
      if (status === "ACTIVE" && existingSession) {
        return res.json({ paymentSessionId: existingSession, orderId: testSessionId });
      }
    } catch (fetchErr: any) {
      // 404 = no order yet for this attempt; anything else we let the create
      // attempt below surface a meaningful error.
      if (fetchErr?.response?.status && fetchErr.response.status !== 404) {
        throw fetchErr;
      }
    }

    const response = await cashfree.PGCreateOrder({
      order_id: testSessionId,
      order_amount: getFullReportPriceINR(),
      order_currency: "INR",
      customer_details: {
        customer_id: testSessionId,
        customer_email: email,
        customer_phone: PLACEHOLDER_PHONE,
      },
      order_meta: {
        // Cashfree substitutes {order_id} and redirects the browser here after
        // the payment attempt. We land back on the app and confirm status.
        return_url: `${baseUrl}/app?cashfree=1&order_id={order_id}`,
      },
    });

    const paymentSessionId = response.data?.payment_session_id;
    if (!paymentSessionId) {
      return res.status(502).json({ error: "Cashfree did not return a payment session" });
    }
    res.json({ paymentSessionId, orderId: response.data?.order_id });
  } catch (error: any) {
    const detail = error?.response?.data?.message || error?.message;
    console.error("Cashfree checkout error:", error?.response?.data || error);
    res.status(500).json({ error: detail || "Failed to create checkout session" });
  }
});

// Confirm whether a test attempt has been paid for, by fetching its Cashfree
// order (order_id === testSessionId) and checking the order status. Used both
// right after the redirect back from Cashfree and on later re-checks. The
// order_id is the caller's own private per-attempt UUID, so it doubles as the
// ownership token.
router.get("/purchase-status", async (req, res) => {
  try {
    const testSessionId = req.query.testSessionId;
    if (!testSessionId || typeof testSessionId !== "string") {
      return res.status(400).json({ error: "testSessionId is required" });
    }
    const email = typeof req.query.email === "string" ? req.query.email : "";
    // Secret email stays unlocked across reloads without any Cashfree order.
    if (isBypassEmail(email)) {
      return res.json({ unlocked: true });
    }
    const cashfree = getCashfreeClient();
    const response = await cashfree.PGFetchOrder(testSessionId);
    const unlocked = response.data?.order_status === "PAID";
    res.json({ unlocked });
  } catch (error: any) {
    // A not-yet-created / unknown order just means "not paid", not an error.
    if (error?.response?.status === 404) {
      return res.json({ unlocked: false });
    }
    const detail = error?.response?.data?.message || error?.message;
    console.error("Cashfree purchase status error:", error?.response?.data || error);
    res.status(500).json({ error: detail || "Failed to check purchase status" });
  }
});

export default router;
