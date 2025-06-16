// public/js/chat.js
document.addEventListener('DOMContentLoaded', () => {
  // 1) Bouton d'ouverture
  const btn = document.createElement('div');
  btn.id = 'chat-button';
  btn.textContent = '💬';
  document.body.appendChild(btn);

  // 2) Popup chat
  const popup = document.createElement('div');
  popup.id = 'chat-popup';
  popup.innerHTML = `
    <div id="chat-messages"></div>
    <div id="chat-input">
      <input type="text" id="chat-text" placeholder="Écrivez un message…" />
      <button id="chat-send">Envoyer</button>
    </div>`;
  document.body.appendChild(popup);

  // 3) Toggle & autofocus
  function toggleChat() {
    if (popup.style.display === 'flex') {
      popup.style.display = 'none';
    } else {
      popup.style.display = 'flex';
      document.getElementById('chat-text').focus();
    }
  }
  btn.addEventListener('click', toggleChat);

  // 4) Fermer au clic hors popup
  document.addEventListener('click', e => {
    if (
      popup.style.display === 'flex' &&
      !popup.contains(e.target) &&
      e.target !== btn
    ) {
      popup.style.display = 'none';
    }
  });

  // 5) Connexion WebSocket
  const socket = io({
    path: '/socket.io',
    transports: ['websocket'],
    withCredentials: true
  });

  socket.on('connect_error', err =>
    console.error('Socket.IO auth error:', err.message)
  );

  // 6) Réception d'un message
  socket.on('chat', data => {
    const { username, message, timestamp } = data;
    const msgEl = document.createElement('div');
    msgEl.textContent = `[${new Date(timestamp).toLocaleTimeString()}] ${username}: ${message}`;
    const cm = document.getElementById('chat-messages');
    cm.appendChild(msgEl);
    cm.scrollTop = cm.scrollHeight;
  });

  // 7) Envoi de message
  function sendMessage() {
    const input = document.getElementById('chat-text');
    const msg = input.value.trim();
    if (!msg) return;
    socket.emit('chat', { message: msg });
    input.value = '';
  }
  document.getElementById('chat-send').addEventListener('click', sendMessage);
  document.getElementById('chat-text').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  // 8) Fermer proprement WS à la déconnexion
  window.addEventListener('beforeunload', () => socket.close());
});
