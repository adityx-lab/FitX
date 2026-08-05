// ════════════════════════════════════════════════════
// coach.js — AI Coach chat tab (talks to backend /coach/chat,
// which in turn calls the Claude API)
// ════════════════════════════════════════════════════

function initChat() {
  if (chatInit) return;
  chatInit = true;
  addBotMsg("Hey! I'm your FitX AI Coach 💪 I can help with workout plans, nutrition advice, form tips, and more. What would you like to work on?");
}

function sendChip(btn) {
  const text = btn.textContent;
  document.getElementById('chat-chips').style.display = 'none';
  sendUserMsg(text);
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  sendUserMsg(text);
}

async function sendUserMsg(text) {
  addMsg('user', text);
  chatHistory.push({ role: 'user', content: text });

  const typingId = addTyping();

  try {
    const data = await api('POST', '/coach/chat', {
      messages: chatHistory,
      userName: userData?.name,
      userGoal: userData?.goal,
    });
    const reply = data.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
    removeTyping(typingId);
    addBotMsg(reply);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    removeTyping(typingId);
    addBotMsg("I'm having trouble connecting to the AI coach right now. Make sure the backend server is running.");
  }
}

function addMsg(role, text) {
  const wrap = document.getElementById('chat-messages');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const div  = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `
    <div class="chat-bubble">${text.replace(/\n/g, '<br>')}</div>
    <div class="chat-meta">${time}</div>
  `;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

function addBotMsg(text) { addMsg('bot', text); }

function addTyping() {
  const wrap = document.getElementById('chat-messages');
  const id   = 'typing-' + Date.now();
  const div  = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id        = id;
  div.innerHTML = `<div class="chat-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
