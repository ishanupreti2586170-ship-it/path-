import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

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
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
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
