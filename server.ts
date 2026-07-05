import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./server/stripeClient";
import { WebhookHandlers } from "./server/webhookHandlers";
import stripeRoutes from "./server/routes";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required for Stripe integration.",
    );
  }

  console.log("Initializing Stripe schema...");
  await runMigrations({ databaseUrl });
  console.log("Stripe schema ready");

  const stripeSync = await getStripeSync();

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) {
    console.log("Setting up managed Stripe webhook...");
    await stripeSync.findOrCreateManagedWebhook(
      `https://${domain}/api/stripe/webhook`,
    );
    console.log("Webhook configured");
  } else {
    console.log("Skipping managed webhook setup (no public domain available yet).");
  }

  console.log("Syncing Stripe data...");
  stripeSync
    .syncBackfill({ object: "all" })
    .then(() => console.log("Stripe data synced"))
    .catch((err) => console.error("Error syncing Stripe data:", err));
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  try {
    await initStripe();
  } catch (error) {
    console.error("Failed to initialize Stripe (payments will be unavailable):", error);
  }

  // Stripe webhook route MUST be registered before express.json() so the
  // raw request body is preserved for signature verification.
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      if (!signature) return res.status(400).json({ error: "Missing signature" });

      const sig = Array.isArray(signature) ? signature[0] : signature;
      try {
        await WebhookHandlers.processWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error("Webhook error:", error.message);
        res.status(400).json({ error: "Webhook processing error" });
      }
    },
  );

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", stripeRoutes);

  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, language } = req.body;
      const langInstructions =
        language && language !== "English"
          ? `\n\nIMPORTANT: Please translate the values in the JSON output into ${language}. The JSON keys MUST remain in English.`
          : "";

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY environment variable is not set. Please configure it in the platform settings.",
        );
      }

      const genAI = new GoogleGenAI({
        apiKey: apiKey,
      });
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt + langInstructions,
      });

      const text =
        result.candidates?.[0]?.content?.parts?.[0]?.text || result.text;
      if (!text) throw new Error("Could not extract text from Gemini response");

      res.json({ result: text.replace(/```json|```/g, "").trim() });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true as true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
