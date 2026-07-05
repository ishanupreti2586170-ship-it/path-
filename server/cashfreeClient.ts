import { Cashfree, CFEnvironment } from "cashfree-pg";

// Cashfree Payment Gateway client. Credentials and environment come from
// secrets/env only -- never hard-code them. Switch CASHFREE_ENV to
// "production" (and swap in live keys) when going live.
let client: Cashfree | null = null;

export function getCashfreeClient(): Cashfree {
  if (client) return client;

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree credentials are missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.",
    );
  }

  const env =
    (process.env.CASHFREE_ENV || "sandbox").toLowerCase() === "production"
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX;

  client = new Cashfree(env, appId, secretKey);
  return client;
}

// Whether the SDK is running against live (production) Cashfree. The frontend
// checkout SDK needs to be told the same mode ("sandbox" | "production").
export function isCashfreeProduction(): boolean {
  return (process.env.CASHFREE_ENV || "sandbox").toLowerCase() === "production";
}

// Fixed one-time price for the Full Report, in INR (whole rupees).
export function getFullReportPriceINR(): number {
  const raw = Number(process.env.FULL_REPORT_PRICE_INR);
  return Number.isFinite(raw) && raw > 0 ? raw : 399;
}
