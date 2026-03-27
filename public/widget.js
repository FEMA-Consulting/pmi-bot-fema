let currentIntent = "";
let chatHistory = [];
let lastLeadSignature = "";

const chatBody = document.getElementById("chat-body");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const quickActions = document.getElementById("quick-actions");
const leadForm = document.getElementById("lead-form");
const leadResponse = document.getElementById("lead-response");

function scrollChatToBottom() {
  if (!chatBody) return;
  chatBody.scrollTop = chatBody.scrollHeight;
}

function addMessage(text, sender = "bot") {
  if (!chatBody) return;

  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatBody.appendChild(msg);
  scrollChatToBottom();
}

function clearQuickActions() {
  if (!quickActions) return;
  quickActions.innerHTML = "";
}

function addQuickButtons(buttons) {
  if (!quickActions) return;

  clearQuickActions();

  buttons.forEach((btn) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-btn";
    button.innerText = btn.label;

    button.addEventListener("click", async () => {
      currentIntent = btn.intent;
      clearQuickActions();
      addMessage(btn.label, "user");
      await handleInitialIntent(btn.intent);
      addResetButton();
    });

    quickActions.appendChild(button);
  });
}

function addResetButton() {
  if (!quickActions) return;

  const existingReset = Array.from(quickActions.querySelectorAll("button")).find(
    (btn) => btn.innerText === "🔄 Ricomincia"
  );

  if (existingReset) return;

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "quick-btn";
  resetBtn.innerText = "🔄 Ricomincia";

  resetBtn.addEventListener("click", () => {
    resetChat();
  });

  quickActions.appendChild(resetBtn);
}

function resetChat() {
  currentIntent = "";
  chatHistory = [];
  lastLeadSignature = "";

  if (chatBody) {
    chatBody.innerHTML = "";
  }

  if (quickActions) {
    quickActions.innerHTML = "";
  }

  if (chatInput) {
    chatInput.value = "";
  }

  initChat();
}

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].trim() : "";
}

function extractPhone(text) {
  const match = text.match(/(\+?\d[\d\s().-]{6,}\d)/);
  return match ? match[0].trim() : "";
}

function extractField(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*:\\s*(.+)`, "i");
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "";
}

function parseLeadFromChat(text) {
  const email = extractEmail(text);
  if (!email) return null;

  const nome =
    extractField(text, ["nome", "name"]) || "";

  const azienda =
    extractField(text, ["azienda", "società", "societa", "company", "impresa"]) || "";

  const telefono =
    extractField(text, ["telefono", "cellulare", "tel", "mobile"]) || extractPhone(text);

  const note =
    extractField(text, ["messaggio", "richiesta", "note"]) || text.trim();

  return {
    nome,
    azienda,
    email,
    telefono,
    interesse: currentIntent || "non_specificato",
    note,
  };
}

async function submitLeadViaFormSubmit(lead) {
  const response = await fetch("https://formsubmit.co/ajax/contatti@fe-ma.info", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: "Nuovo lead da chatbot FE.MA. Consulting",
      Nome: lead.nome || "",
      Azienda: lead.azienda || "",
      Email: lead.email || "",
      Telefono: lead.telefono || "",
      Interesse: lead.interesse || "",
      Messaggio: lead.note || "",
    }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  return { response, data };
}

async function tryCaptureLeadFromChat(message) {
  const lead = parseLeadFromChat(message);
  if (!lead) return false;

  const signature = `${lead.email}|${lead.telefono}|${lead.note}`;
  if (signature === lastLeadSignature) {
    return true;
  }

  try {
    const { response } = await submitLeadViaFormSubmit(lead);

    if (response.ok) {
      lastLeadSignature = signature;
      addMessage(
        "Grazie, la tua richiesta è stata inviata correttamente. Un nostro consulente la esaminerà con attenzione e ti contatteremo nel più breve tempo possibile per un primo riscontro.",
        "bot"
      );
      return true;
    }

    addMessage(
      "Ho ricevuto i tuoi dati, ma c'è stato un problema tecnico nell'invio. Ti invito a riprovare oppure a scrivere direttamente a contatti@fe-ma.info.",
      "bot"
    );
    return true;
  } catch (error) {
    addMessage(
      "Ho ricevuto i tuoi dati, ma si è verificato un errore temporaneo nell'invio. Ti invito a riprovare oppure a scrivere direttamente a contatti@fe-ma.info.",
      "bot"
    );
    return true;
  }
}

async function sendMessage(message, showUserMessage = true) {
  if (showUserMessage) {
    addMessage(message, "user");
  }

  chatHistory.push({ role: "user", content: message });

  const leadCaptured = await tryCaptureLeadFromChat(message);
  if (leadCaptured) {
    return;
  }

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        intent: currentIntent,
        history: chatHistory.slice(-8),
      }),
    });

    const data = await response.json();
    const reply =
      data.reply || "Si è verificato un problema nella risposta.";

    addMessage(reply, "bot");
    chatHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    addMessage(
      "Si è verificato un errore temporaneo. Puoi riprovare tra poco oppure scrivere a contatti@fe-ma.info",
      "bot"
    );
  }
}

async function handleInitialIntent(intent) {
  if (intent === "patent_box") {
    await sendMessage(
      "Vorrei capire se la mia azienda può avere opportunità con il Patent Box.",
      false
    );
  } else if (intent === "crediti_imposta") {
    await sendMessage(
      "Vorrei capire se la mia azienda può avere accesso a crediti d’imposta.",
      false
    );
  } else if (intent === "software_su_misura") {
    await sendMessage(
      "Vorrei capire se per la mia azienda può essere utile valutare un software su misura.",
      false
    );
  } else if (intent === "verifica_caso") {
    await sendMessage(
      "Non so quale soluzione sia più adatta al mio caso.",
      false
    );
  } else if (intent === "contatto_consulente") {
    await sendMessage(
      "Vorrei essere ricontattato da un consulente.",
      false
    );
  }
}

if (chatForm) {
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!chatInput) return;

    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = "";
    await sendMessage(message);
  });
}

function initChat() {
  addMessage(
    "Ciao 👋 Posso aiutarti a capire in pochi minuti se la tua azienda potrebbe accedere a Patent Box o crediti d’imposta, oppure se può essere utile valutare un software su misura per le tue esigenze."
  );

  addMessage("Scegli pure da dove vuoi partire 👇");

  addQuickButtons([
    { label: "Patent Box", intent: "patent_box" },
    { label: "Crediti d’imposta", intent: "crediti_imposta" },
    { label: "Software su misura", intent: "software_su_misura" },
    { label: "Non so quale soluzione è adatta", intent: "verifica_caso" },
    { label: "Parlare con un consulente", intent: "contatto_consulente" },
  ]);

  addResetButton();
}

initChat();

if (leadForm) {
  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("lead-nome")?.value.trim() || "";
    const azienda = document.getElementById("lead-azienda")?.value.trim() || "";
    const email = document.getElementById("lead-email")?.value.trim() || "";
    const telefono = document.getElementById("lead-telefono")?.value.trim() || "";
    const note = document.getElementById("lead-note")?.value.trim() || "";

    if (!nome || !azienda || !email) {
      if (leadResponse) {
        leadResponse.textContent = "Compila almeno nome, azienda ed email.";
      }
      return;
    }

    try {
      const { response } = await submitLeadViaFormSubmit({
        nome,
        azienda,
        email,
        telefono,
        interesse: currentIntent || "non_specificato",
        note,
      });

      if (response.ok) {
        if (leadResponse) {
          leadResponse.textContent =
            "Grazie, la tua richiesta è stata inviata correttamente. Un nostro consulente la esaminerà con attenzione e ti contatteremo nel più breve tempo possibile per un primo riscontro.";
        }
        leadForm.reset();
      } else {
        if (leadResponse) {
          leadResponse.textContent =
            "Si è verificato un problema durante l'invio della richiesta. Ti invitiamo a riprovare tra poco.";
        }
      }
    } catch (error) {
      if (leadResponse) {
        leadResponse.textContent =
          "Si è verificato un errore temporaneo durante l'invio. Ti invitiamo a riprovare tra poco.";
      }
    }
  });
}
