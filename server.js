import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import systemPrompt from "./prompts/systemPrompt.js";

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const leadsFilePath = path.join(__dirname, "data", "leads.json");

function ensureLeadsFile() {
  const dataDir = path.join(__dirname, "data");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(leadsFilePath)) {
    fs.writeFileSync(leadsFilePath, "[]", "utf8");
  }
}

ensureLeadsFile();

function getIntentIntro(intent) {
  switch (intent) {
    case "patent_box":
      return `
L'utente ha scelto il tema Patent Box.
Concentrati su software proprietario, costi di sviluppo, titolarità, utilizzo e verifica preliminare.
Concludi cercando di portare l'utente verso una raccolta dati per contatto.
`;
    case "crediti_imposta":
      return `
L'utente ha scelto il tema crediti d’imposta.
Concentrati su investimenti in innovazione, software, digitalizzazione, documentazione disponibile e verifica preliminare.
Concludi cercando di portare l'utente verso una raccolta dati per contatto.
`;
    case "verifica_caso":
      return `
L'utente non sa quale agevolazione sia più adatta.
Fai poche domande intelligenti per capire se il caso è più vicino a Patent Box o crediti d’imposta.
`;
    case "contatto_consulente":
      return `
L'utente vuole essere ricontattato da un consulente.
Invitalo a lasciare nome, azienda, email e telefono facoltativo.
`;
    default:
      return `
L'utente è nella fase iniziale.
Aiutalo a capire se parlare di Patent Box, crediti d’imposta o richiesta di contatto.
`;
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, intent, history = [] } = req.body;

    const intentPrompt = getIntentIntro(intent);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: intentPrompt },
      ...history,
      { role: "user", content: message || "Avvio conversazione" },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
      temperature: 0.4,
      max_tokens: 350,
    });

    const reply =
      response.choices?.[0]?.message?.content ||
      "Si è verificato un problema nella risposta.";

    res.json({ reply });
  } catch (error) {
    console.error("Errore /api/chat:", error);
    res.status(500).json({
      reply:
        "Si è verificato un errore temporaneo. Puoi riprovare tra poco oppure scrivere a contatti@fe-ma.info",
    });
  }
});

app.post("/api/lead", (req, res) => {
  try {
    const {
      nome = "",
      azienda = "",
      email = "",
      telefono = "",
      interesse = "",
      note = "",
    } = req.body;

    const raw = fs.readFileSync(leadsFilePath, "utf8");
    const leads = JSON.parse(raw);

    const newLead = {
      nome,
      azienda,
      email,
      telefono,
      interesse,
      note,
      createdAt: new Date().toISOString(),
    };

    leads.push(newLead);
    fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), "utf8");

    res.json({ success: true, message: "Lead salvato correttamente." });
  } catch (error) {
    console.error("Errore /api/lead:", error);
    res.status(500).json({
      success: false,
      message: "Errore durante il salvataggio del lead.",
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
