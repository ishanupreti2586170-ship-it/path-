import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import paymentRoutes from "./server/routes";

const SITE_URL = "https://truepathcareer.com";

// Per-route metadata injected into the static HTML in production so that
// crawlers and social scrapers (which don't run the app's JavaScript) receive
// real, route-specific title/description/canonical/OG tags. In the browser,
// react-helmet-async keeps these in sync for users and JS-rendering crawlers.
const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "The Career Oracle — Free Psychometric Career Test & Path Finder",
    description:
      "Discover your ideal career with The Career Oracle: a science-backed career test using the Big Five, Holland Code (RIASEC), and cognitive style. Matched to real occupations with transparent, deterministic scoring.",
  },
  "/app": {
    title: "Take the Career Test — The Career Oracle",
    description:
      "Answer a short psychometric assessment and get matched to real careers using validated psychology and transparent, deterministic scoring. No AI guessing in the diagnostic.",
  },
  "/about-us": {
    title: "About & Disclaimer — The Career Oracle",
    description:
      "How The Career Oracle works: Big Five personality, Holland Code (RIASEC) interests, cognitive style, and deterministic career matching — plus an honest disclaimer.",
  },
  "/privacy-policy": {
    title: "Privacy Policy — The Career Oracle",
    description:
      "How The Career Oracle collects, uses, and protects your data, including third-party services used for payments and AI growth suggestions.",
  },
  "/terms-of-service": {
    title: "Terms of Service — The Career Oracle",
    description:
      "The terms and conditions for using The Career Oracle career assessment, including disclaimers and limitations of liability.",
  },
};

function injectMeta(template: string, rawPath: string): string {
  // Normalize trailing slashes (except root) so "/about-us/" matches "/about-us".
  const routePath =
    rawPath.length > 1 ? rawPath.replace(/\/+$/, "") || "/" : rawPath;
  const meta = ROUTE_META[routePath];
  if (!meta) return template;
  const url = `${SITE_URL}${routePath === "/" ? "/" : routePath}`;
  const t = meta.title;
  const d = meta.description;
  return template
    .replace(/<title[^>]*>[\s\S]*?<\/title>/, `<title data-rh="true">${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", paymentRoutes);

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
    const template = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
    // Serve built assets, but let our handler render index.html so we can
    // inject per-route SEO meta tags.
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(injectMeta(template, req.path));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
