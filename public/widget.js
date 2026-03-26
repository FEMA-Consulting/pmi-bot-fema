const chatBody = document.getElementById("chat-body");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");

function scrollToBottom() {
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 100);
}

function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatBody.appendChild(msg);
  scrollToBottom();
}

// === RISPOSTA BOT SEMPLICE ===
function botReply(userText) {
  addMessage("Grazie! Sto elaborando la tua richiesta...");

  setTimeout(() => {
    addMessage(
      "Posso aiutarti a verificare se puoi accedere al Patent Box, ai crediti d’imposta oppure valutare un software su misura sviluppato con Biemme Informatica."
    );
  }, 800);
}

// === INVIO LEAD (EMAIL) ===
function sendLead(data) {
  fetch("https://formsubmit.co/ajax/contatti@fe-ma.info", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      Nome: data.nome,
      Cognome: data.cognome,
      Azienda: data.azienda,
      Email: data.email,
      Messaggio: data.messaggio || "Richiesta da chatbot FE.MA."
    })
  })
    .then(response => response.json())
    .then(() => {
      addMessage(
        "✅ Richiesta inviata correttamente!\nUn nostro consulente analizzerà la tua situazione e ti contatterà nel più breve tempo possibile."
      );
    })
    .catch(() => {
      addMessage("❌ Errore nell'invio. Riprova tra qualche minuto.");
    });
}

// === GESTIONE FORM CHAT ===
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  botReply(text);
});

// === QUICK BUTTONS ===
document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const text = btn.innerText;
    addMessage(text, "user");
    botReply(text);
  });
});

// === LEAD FORM (se presente) ===
const leadForm = document.getElementById("lead-form");

if (leadForm) {
  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const data = {
      nome: document.getElementById("nome").value,
      cognome: document.getElementById("cognome").value,
      azienda: document.getElementById("azienda").value,
      email: document.getElementById("email").value,
      messaggio: document.getElementById("messaggio").value
    };

    sendLead(data);

    leadForm.reset();
  });
}

// === RESET CHAT ===
const resetBtn = document.getElementById("reset-chat");

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    chatBody.innerHTML = "";

    addMessage("Ciao 👋 Posso aiutarti a capire se la tua azienda può accedere a Patent Box, crediti d’imposta o software su misura.");

    scrollToBottom();
  });
}
