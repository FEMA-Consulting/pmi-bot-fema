let currentIntent = "";
let chatHistory = [];

const chatBody = document.getElementById("chat-body");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const quickActions = document.getElementById("quick-actions");

function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function addQuickButtons(buttons) {
  quickActions.innerHTML = "";

  buttons.forEach((btn) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-btn";
    button.innerText = btn.label;
    button.addEventListener("click", () => {
      currentIntent = btn.intent;
      addMessage(btn.label, "user");
      quickActions.innerHTML = "";
      handleInitialIntent(btn.intent);
    });
    quickActions.appendChild(button);
  });
}

async function sendMessage(message) {
  addMessage(message, "user");

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
    addMessage(data.reply, "bot");
    chatHistory.push({ role: "assistant", content: data.reply });
  } catch (error) {
    addMessage("Errore temporaneo. Scrivi a contatti@fe-ma.info", "bot");
  }
}

async function handleInitialIntent(intent) {
  if (intent === "patent_box") {
    await sendMessage("Vorrei capire se la mia azienda può avere opportunità con il Patent Box.");
  } else if (intent === "crediti_imposta") {
    await sendMessage("Vorrei capire se la mia azienda può avere accesso a crediti d’imposta.");
  } else if (intent === "verifica_caso") {
    await sendMessage("Non so quale agevolazione sia più adatta al mio caso.");
  } else if (intent === "contatto_consulente") {
    await sendMessage("Vorrei essere ricontattato da un consulente.");
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = "";
  await sendMessage(message);
});

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

const leadForm = document.getElementById("lead-form");
const leadResponse = document.getElementById("lead-response");

if (leadForm) {
  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      nome: document.getElementById("lead-nome").value.trim(),
      azienda: document.getElementById("lead-azienda").value.trim(),
      email: document.getElementById("lead-email").value.trim(),
      telefono: document.getElementById("lead-telefono").value.trim(),
      interesse: currentIntent || "non_specificato",
      note: document.getElementById("lead-note").value.trim(),
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
        leadResponse.innerText = "Richiesta inviata correttamente.";
        leadForm.reset();
      } else {
        leadResponse.innerText = "Errore durante l'invio della richiesta.";
      }
    } catch (error) {
      leadResponse.innerText = "Errore temporaneo durante l'invio.";
    }
  });
}
