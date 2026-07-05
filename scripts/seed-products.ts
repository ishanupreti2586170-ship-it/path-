import { getUncachableStripeClient } from "../server/stripeClient";
import { FULL_REPORT_PRODUCT_NAME } from "../server/storage";

/**
 * Creates the "Full Career Report Unlock" one-time-purchase product in Stripe.
 * Idempotent -- safe to run multiple times.
 *
 * Run with: npx tsx scripts/seed-products.ts
 */
async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log("Creating products and prices in Stripe...");

    const existingProducts = await stripe.products.search({
      query: `name:'${FULL_REPORT_PRODUCT_NAME}' AND active:'true'`,
    });

    if (existingProducts.data.length > 0) {
      console.log(`${FULL_REPORT_PRODUCT_NAME} already exists. Skipping creation.`);
      console.log(`Existing product ID: ${existingProducts.data[0].id}`);
      return;
    }

    const product = await stripe.products.create({
      name: FULL_REPORT_PRODUCT_NAME,
      description:
        "Unlocks the full downloadable Career Oracle report, including the AI-generated growth path and PDF export.",
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 499, // $4.99 one-time
      currency: "usd",
    });
    console.log(`Created one-time price: $4.99 (${price.id})`);

    console.log("Products and prices created successfully!");
    console.log("Webhooks will sync this data to your database automatically.");
  } catch (error: any) {
    console.error("Error creating products:", error.message);
    process.exit(1);
  }
}

createProducts();
