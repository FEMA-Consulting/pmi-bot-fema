import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/api/config", (_req, res) => {
  res.json({
    brandName: "FE.MA. Consulting"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const rawMessages = body.messages;

    let messages = [];
    if (Array.isArray(rawMessages)) {
      messages = rawMessages;
    } else if (typeof rawMessages === "string" && rawMessages.trim()) {
      messages = [{ role: "user", content: rawMessages.trim() }];
    }

    const input = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: [
        {
          type: m.role === "assistant" ? "output_text" : "input_text",
          text: String(m.content || "")
        }
      ]
    }));

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input
    });

    const reply =
      response.output_text?.trim() ||
      "Non sono riuscito a generare una risposta utile.";

    res.json({ ok: true, reply });
  } catch (error) {
    console.error("Errore chat:", error);
    res.status(500).json({ ok: false, error: "Errore interno server" });
  }
});

app.post("/api/lead", (req, res) => {
  res.json({
    ok: true,
    lead: {
      band: "medio",
      score: 5
    }
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`PMI bot starter avviato su http://localhost:${PORT}`);
});
