const chatToggle = document.getElementById('chatToggle');
const chatWidget = document.getElementById('chatWidget');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const quickActions = document.getElementById('quickActions');
const leadForm = document.getElementById('leadForm');
const brandName = document.getElementById('brandName');

const state = {
  messages: [],
  brandName: 'Assistente',
  leadFormOpen: false
};

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  state.messages.push({ role, content: text });
}

function addSystemNote(text) {
  const note = document.createElement('div');
  note.className = 'system-note';
  note.textContent = text;
  chatMessages.appendChild(note);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleLeadForm(show = true) {
  state.leadFormOpen = show;
  leadForm.classList.toggle('hidden', !show);
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    state.brandName = data.brandName || state.brandName;
    brandName.textContent = state.brandName;
  } catch {
    brandName.textContent = state.brandName;
  }
}

async function askBot(text) {
  addMessage('user', text);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Errore chat');
    }

    addMessage('assistant', data.reply || 'Nessuna risposta disponibile.');

    if (/ricontatt|lascia i dati|contatto/i.test(data.reply || '')) {
      toggleLeadForm(true);
    }
  } catch (error) {
    console.error('Errore chat:', error);
    addMessage(
      'assistant',
      'C\'è stato un problema tecnico. Puoi comunque lasciare i tuoi dati qui sotto e verrai ricontattato.'
    );
    toggleLeadForm(true);
  }
}

chatToggle.addEventListener('click', () => {
  chatWidget.classList.remove('hidden');
  chatToggle.classList.add('hidden');

  if (state.messages.length === 0) {
    addMessage(
  	'assistant',
 	 `Ciao 👋  
	Ti aiuto a capire in 2 minuti se la tua azienda può ottenere benefici fiscali (Patent Box, crediti d’imposta, ecc.).

	Hai sviluppato software, processi o soluzioni innovative negli ultimi anni?`
	);
  }
});

chatClose.addEventListener('click', () => {
  chatWidget.classList.add('hidden');
  chatToggle.classList.remove('hidden');
});

quickActions.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
if (action === "Verificare agevolazioni") {
  askBot("Voglio verificare se la mia azienda può ottenere agevolazioni fiscali");
} else if (action === "Informazioni sui servizi") {
  askBot("Voglio capire meglio i vostri servizi e le opportunità disponibili");
} else if (action === "Essere ricontattato") {
  askBot("Voglio essere ricontattato da un consulente FE.MA.");
} else {
  askBot(action);
}

  if (action === 'Essere ricontattato') {
    toggleLeadForm(true);
  }
});

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  await askBot(text);
});

leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(leadForm);
  const payload = Object.fromEntries(formData.entries());
  payload.wantsCallback = formData.get('wantsCallback') === 'on';
  payload.interest = state.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join(' | ')
    .slice(0, 1500);

  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Errore invio lead');

    addMessage(
      'assistant',
      `Perfetto, richiesta registrata. Classificazione lead: ${data.lead.band} (score ${data.lead.score}). Verrai ricontattato al più presto.`
    );
    leadForm.reset();
    toggleLeadForm(false);
  } catch (error) {
    console.error('Errore lead:', error);
    addMessage(
      'assistant',
      'Non sono riuscito a salvare il contatto. Controlla il server oppure invia la richiesta via email.'
    );
  }
});

loadConfig();
