import { pool } from "./db";

const FULL_REPORT_PRODUCT_NAME = "Full Career Report Unlock";

export const storage = {
  /**
   * Finds the active one-time price for the Full Report product by
   * reading directly from the Stripe-synced `stripe.products`/`stripe.prices`
   * tables (populated by stripe-replit-sync). No local product tables.
   */
  async getFullReportPrice(): Promise<{ productId: string; priceId: string } | null> {
    const result = await pool.query(
      `SELECT p.id as product_id, pr.id as price_id
       FROM stripe.products p
       JOIN stripe.prices pr ON pr.product = p.id
       WHERE p.name = $1 AND p.active = true AND pr.active = true
       ORDER BY pr.created DESC
       LIMIT 1`,
      [FULL_REPORT_PRODUCT_NAME],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { productId: row.product_id, priceId: row.price_id };
  },

  /**
   * Checks whether a given visitor has a completed, paid checkout session
   * for the Full Report product, using the client_reference_id we set at
   * checkout time. Reads straight from the Stripe-synced checkout_sessions
   * table -- no separate purchases table needed.
   */
  async hasVisitorPaid(visitorId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM stripe.checkout_sessions
       WHERE client_reference_id = $1 AND payment_status = 'paid'
       LIMIT 1`,
      [visitorId],
    );
    return (result.rowCount ?? 0) > 0;
  },
};

export { FULL_REPORT_PRODUCT_NAME };
