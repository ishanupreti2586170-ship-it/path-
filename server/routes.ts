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

// Rate limiting for the restore-by-order-id endpoint -- someone brute-forcing
// random order IDs shouldn't be able to hammer the Cashfree API through us.
// In-memory is fine here: this is a coarse abuse guard, not a security
// boundary, and resets on redeploy are an acceptable tradeoff.
const RESTORE_WINDOW_MS = 15 * 60 * 1000;
const RESTORE_MAX_ATTEMPTS = 10;
const restoreAttempts = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = restoreAttempts.get(key);
  if (!entry || now - entry.windowStart > RESTORE_WINDOW_MS) {
    restoreAttempts.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RESTORE_MAX_ATTEMPTS;
}

// Builds the "receipt" summary shown in the confirmation banner from
// Cashfree's payment records for an order. Cashfree doesn't provide a hosted
// receipt URL the way Stripe does, so instead we surface the payment facts
// (amount, method, time, Cashfree's own payment id) directly in the UI.
async function getReceiptForOrder(orderId: string) {
  const cashfree = getCashfreeClient();
  const payments = await cashfree.PGOrderFetchPayments(orderId);
  const successful = (payments.data || [])
    .filter((p) => p.payment_status === "SUCCESS")
    .sort((a, b) => {
      const at = a.payment_completion_time ? Date.parse(a.payment_completion_time) : 0;
      const bt = b.payment_completion_time ? Date.parse(b.payment_completion_time) : 0;
      return bt - at;
    })[0];
  if (!successful) return null;
  return {
    orderId,
    cfPaymentId: successful.cf_payment_id ?? null,
    amount: successful.payment_amount ?? null,
    currency: successful.payment_currency ?? null,
    method: successful.payment_group ?? null,
    completedAt: successful.payment_completion_time ?? null,
  };
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
// ownership token. When unlocked, also returns a "receipt" summary (amount,
// method, time) built from Cashfree's own payment records -- Cashfree has no
// hosted receipt link like Stripe's, so this in-app summary is the receipt.
router.get("/purchase-status", async (req, res) => {
  try {
    const testSessionId = req.query.testSessionId;
    if (!testSessionId || typeof testSessionId !== "string") {
      return res.status(400).json({ error: "testSessionId is required" });
    }
    const email = typeof req.query.email === "string" ? req.query.email : "";
    // Secret email stays unlocked across reloads without any Cashfree order.
    if (isBypassEmail(email)) {
      return res.json({ unlocked: true, receipt: null });
    }
    const cashfree = getCashfreeClient();
    const response = await cashfree.PGFetchOrder(testSessionId);
    const unlocked = response.data?.order_status === "PAID";

    let receipt = null;
    if (unlocked) {
      try {
        receipt = await getReceiptForOrder(testSessionId);
      } catch (e) {
        console.error("Receipt lookup error:", e);
      }
    }

    res.json({ unlocked, receipt });
  } catch (error: any) {
    // A not-yet-created / unknown order just means "not paid", not an error.
    if (error?.response?.status === 404) {
      return res.json({ unlocked: false, receipt: null });
    }
    const detail = error?.response?.data?.message || error?.message;
    console.error("Cashfree purchase status error:", error?.response?.data || error);
    res.status(500).json({ error: detail || "Failed to check purchase status" });
  }
});

// Restores access on a new device/browser. There are no accounts, so the
// order ID (== the testSessionId shown to the user as their "confirmation
// code" once unlocked) is the ownership proof -- it's verified live against
// Cashfree, exactly like the original per-attempt purchase check, just
// callable from a browser that never had that testSessionId in its own
// sessionStorage. Rate-limited per IP since this is effectively a lookup
// endpoint for an unauthenticated identifier.
router.post("/restore-purchase", async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (isRateLimited(`restore:${ip}`)) {
      return res.status(429).json({ error: "Too many attempts. Please try again later." });
    }

    const { testSessionId } = req.body || {};
    if (!testSessionId || typeof testSessionId !== "string") {
      return res.status(400).json({ error: "Your confirmation code is required." });
    }

    const cashfree = getCashfreeClient();
    let order;
    try {
      order = await cashfree.PGFetchOrder(testSessionId);
    } catch (fetchErr: any) {
      if (fetchErr?.response?.status === 404) {
        return res.status(404).json({ error: "No purchase found for that confirmation code." });
      }
      throw fetchErr;
    }

    if (order.data?.order_status !== "PAID") {
      return res.status(404).json({ error: "No paid purchase found for that confirmation code." });
    }

    let receipt = null;
    try {
      receipt = await getReceiptForOrder(testSessionId);
    } catch (e) {
      console.error("Receipt lookup error:", e);
    }

    res.json({ testSessionId, unlocked: true, receipt });
  } catch (error: any) {
    const detail = error?.response?.data?.message || error?.message;
    console.error("Restore purchase error:", error?.response?.data || error);
    res.status(500).json({ error: detail || "Failed to restore purchase" });
  }
});

export default router;
