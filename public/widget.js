let currentIntent = "";
let chatHistory = [];

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

function addQuickButtons(buttons) {
  if (!quickActions) return;

  quickActions.innerHTML = "";

  buttons.forEach((btn) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-btn";
    button.innerText = btn.label;

    button.addEventListener("click", async () => {
      currentIntent = btn.intent;
      quickActions.innerHTML = "";
      addMessage(btn.label, "user");
      await handleInitialIntent(btn.intent);
    });

    quickActions.appendChild(button);
  });
}

async function sendMessage(message, showUserMessage = true) {
  if (showUserMessage) {
    addMessage(message, "user");
  }

  chatHistory.push({ role: "user", content: message });

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
      "Errore temporaneo. Scrivi a contatti@fe-ma.info",
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
  } else if (intent === "verifica_caso") {
    await sendMessage(
      "Non so quale agevolazione sia più adatta al mio caso.",
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
    "Ciao 👋 Posso aiutarti a capire in pochi minuti se la tua azienda potrebbe accedere a Patent Box o crediti d’imposta."
  );

  addMessage("Scegli pure da dove vuoi partire 👇");

  addQuickButtons([
    { label: "Patent Box", intent: "patent_box" },
    { label: "Crediti d’imposta", intent: "crediti_imposta" },
    { label: "Non so quale agevolazione è adatta", intent: "verifica_caso" },
    { label: "Parlare con un consulente", intent: "contatto_consulente" },
  ]);
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
        leadResponse.innerText = "Compila almeno nome, azienda ed email.";
      }
      return;
    }

    const payload = {
      nome,
      azienda,
      email,
      telefono,
      interesse: currentIntent || "non_specificato",
      note,
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        if (leadResponse) {
          leadResponse.innerText = "Richiesta inviata correttamente.";
        }
        leadForm.reset();
      } else {
        if (leadResponse) {
          leadResponse.innerText = "Errore durante l'invio della richiesta.";
        }
      }
    } catch (error) {
      if (leadResponse) {
        leadResponse.innerText = "Errore temporaneo durante l'invio.";
      }
    }
  });
}
