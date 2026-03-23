import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const leadsFile = path.join(dataDir, 'leads.jsonl');
const businessConfigPath = path.join(dataDir, 'business-config.json');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(rootDir, 'public')));

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function loadBusinessConfig() {
  const raw = await fs.readFile(businessConfigPath, 'utf8');
  return JSON.parse(raw);
}

function buildSystemPrompt(config) {
  return `
Sei un consulente esperto di FE.MA. Consulting.

OBIETTIVO:
Generare contatti qualificati (lead), NON fare conversazioni lunghe.

STILE:
- chiaro
- professionale
- diretto
- massimo 4-5 righe per risposta

REGOLE:
- fai sempre una domanda
- guida la conversazione
- porta sempre verso il contatto
- evita spiegazioni lunghe e teoriche

SERVIZI:
- Patent Box (software e innovazione)
- Crediti d’imposta
- Agevolazioni fiscali per imprese

FLUSSO:

1. PRIMO MESSAGGIO:
"Ciao 👋  
Ti aiuto a capire in 2 minuti se la tua azienda può ottenere benefici fiscali (Patent Box, crediti d’imposta, ecc.).

Hai sviluppato software, processi o soluzioni innovative negli ultimi anni?"

2. SE INTERESSE:
Fai massimo 2-3 domande:
- settore
- investimenti recenti
- uso agevolazioni

3. CHIUSURA:
"In base a quello che mi hai detto, vale la pena fare una verifica gratuita.

Vuoi essere ricontattato da un consulente FE.MA.?"

IMPORTANTE:
Ogni risposta deve portare al contatto finale.
`;
}

function scoreLead(lead) {
  let score = 0;
  const text = `${lead.companyType || ''} ${lead.interest || ''} ${lead.notes || ''}`.toLowerCase();
  const amount = Number(lead.estimatedAmount || 0);

  if (/(software|innovazione|tecnologia|digitale|sviluppo)/i.test(text)) score += 3;
  if (/(2024|2025|2026|recente|ultimi)/i.test(text)) score += 2;
  if (amount >= 200000) score += 3;
  else if (amount >= 50000) score += 2;
  else if (amount > 0) score += 1;
  if (lead.wantsCallback) score += 3;
  if (lead.email) score += 1;
  if (lead.phone) score += 1;

  let band = 'freddo';
  if (score >= 8) band = 'caldo';
  else if (score >= 5) band = 'medio';

  return { score, band };
}

async function saveLead(lead) {
  await ensureDataDir();
  const enrichment = scoreLead(lead);
  const record = {
    id: `lead_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...lead,
    ...enrichment
  };

  await fs.appendFile(leadsFile, JSON.stringify(record) + '\n', 'utf8');
  return record;
}

function normalizeMessages(body) {
  const rawMessages = body?.messages;

  if (Array.isArray(rawMessages)) {
    return rawMessages
      .map((m) => {
        if (!m) return null;
        if (typeof m === 'string') {
          return { role: 'user', content: m };
        }
        return {
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content ?? '').trim()
        };
      })
      .filter((m) => m && m.content);
  }

  if (typeof rawMessages === 'string' && rawMessages.trim()) {
    return [{ role: 'user', content: rawMessages.trim() }];
  }

  if (typeof body?.text === 'string' && body.text.trim()) {
    return [{ role: 'user', content: body.text.trim() }];
  }

  return [];
}

function extractResponseText(response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  if (Array.isArray(response.output)) {
    const parts = [];
    for (const item of response.output) {
      if (!Array.isArray(item.content)) continue;
      for (const part of item.content) {
        if (part?.type === 'output_text' && part?.text) {
          parts.push(String(part.text).trim());
        }
      }
    }
    if (parts.length) return parts.join('\n').trim();
  }

  return '';
}

app.get('/api/health', async (_req, res) => {
  const config = await loadBusinessConfig();
  res.json({
    ok: true,
    apiConfigured: Boolean(client),
    brandName: config.brandName
  });
});

app.get('/api/config', async (_req, res) => {
  const config = await loadBusinessConfig();
  res.json({
    brandName: config.brandName,
    website: config.website,
    responseTime: config.responseTime,
    services: config.services.map((s) => ({
      slug: s.slug,
      name: s.name,
      summary: s.summary
    }))
  });
});

app.post('/api/lead', async (req, res) => {
  try {
    const lead = req.body || {};
    const saved = await saveLead(lead);
    res.json({ ok: true, lead: saved });
  } catch (error) {
    console.error('Errore salvataggio lead:', error);
    res.status(500).json({ ok: false, error: 'Impossibile salvare il lead.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const config = await loadBusinessConfig();
    const messages = normalizeMessages(req.body || {});

    if (!client) {
      return res.json({
        ok: true,
        reply: 'Il bot è in modalità demo locale: configura OPENAI_API_KEY per ottenere risposte AI. Intanto puoi usare i pulsanti e il modulo lead.',
        source: 'demo'
      });
    }

    if (!messages.length) {
      return res.json({
        ok: true,
        reply: 'Scrivimi pure una domanda oppure usa i pulsanti iniziali.',
        source: 'fallback'
      });
    }

    const input = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [
        {
          type: m.role === 'assistant' ? 'output_text' : 'input_text',
          text: m.content
        }
      ]
    }));

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      instructions: buildSystemPrompt(config),
      input,
      max_output_tokens: 350
    });

    const reply = extractResponseText(response) ||
      'Non sono riuscito a generare una risposta utile. Lascia i tuoi dati e ti ricontattiamo.';

    res.json({ ok: true, reply, source: 'openai' });
  } catch (error) {
    console.error('Errore chat:', error);
    const message = error?.status === 429
      ? 'Limite o credito API esaurito. Controlla il billing OpenAI e riprova.'
      : 'Errore nella generazione della risposta.';
    res.status(500).json({ ok: false, error: message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`PMI bot starter avviato su http://localhost:${port}`);
});
