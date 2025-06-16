// menu.js (public/js/menu/menu.js)

// Animation du logo
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('logo-text');
  const logo = document.querySelector('.logo');
  const base = 'Nerd Corner', alt = 'Cornerd';
  let fromArr = [], toArr = [], i = 0, animating = false;
  const randomDelay = () => 80 + Math.random() * 70;

  function erase() {
    if (i < fromArr.length) {
      el.textContent = fromArr.slice(0, fromArr.length - i - 1).join('');
      i++;
      setTimeout(erase, randomDelay());
    } else {
      i = 0;
      setTimeout(type, randomDelay() + 100);
    }
  }
  function type() {
    if (i < toArr.length) {
      el.textContent += toArr[i++];
      setTimeout(type, randomDelay());
    } else {
      animating = false;
      setTimeout(() => el.classList.add('finish'), 200);
      setTimeout(() => el.classList.remove('typing','finish'), 200 + 3600 + 1000);
    }
  }
  function startAnimation() {
    if (animating) return;
    animating = true;
    el.classList.add('typing');
    const current = el.textContent;
    if (current === base) { fromArr = base.split(''); toArr = alt.split(''); }
    else               { fromArr = alt.split('');   toArr = base.split(''); }
    i = 0; erase();
  }
  logo.addEventListener('click', startAnimation);
});

// Chargement des infos utilisateur et gestion des états
document.addEventListener('DOMContentLoaded', async () => {
  const loginEl   = document.getElementById('login-link');
  const signupEl  = document.getElementById('signup-link');
  const dashEl    = document.getElementById('dashboard-link');
  const profileEl = document.getElementById('profile-link');
  const logoutEl  = document.getElementById('logout-link');

  const container = document.getElementById('player-container');
  const tplLogged = document.getElementById('tpl-logged').content;
  const tplGuest  = document.getElementById('tpl-guest').content;

  let logged = false;

  try {
    const infoRes = await csrfFetch('/api/user/info');
    if (infoRes.headers.get('Content-Type')?.includes('application/json')) {
      const info = await infoRes.json();

      // Récupération rang & badges
      const { rank } = await (await csrfFetch('/api/user/rank')).json();
      const badges = await (await csrfFetch('/api/badges')).json();
      const owned = [];
      if (+badges.trader === info.id) owned.push('Top Trader');
      if (+badges.snake  === info.id) owned.push('Top Snake');
      if (+badges.pong   === info.id) owned.push('Top Pong');

      // Injection template connecté
      const clone = document.importNode(tplLogged, true);
      clone.querySelector('.username').textContent = info.username;
      clone.querySelector('.balance').textContent  = info.balance;
      clone.querySelector('.badges').textContent   = owned.join(' • ');
      clone.querySelector('.rank').textContent     = rank;
      container.replaceChildren(clone);

      // crucial : on ajoute la classe logged
      container.classList.add('logged');
      container.classList.remove('guest');

      logged = true;
    }
  } catch (err) {
    console.error('Menu init error:', err);
  }

  if (logged) {
    loginEl.style.display  = 'none';
    signupEl.style.display = 'none';
    dashEl.style.display   = 'inline-block';
    profileEl.style.display= 'inline-block';
    logoutEl.style.display = 'inline-block';
    logoutEl.addEventListener('click', e => {
      e.preventDefault();
      csrfFetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/index.html');
    });
  } else {
    // template invité
    const clone = document.importNode(tplGuest, true);
    container.replaceChildren(clone);

    // et on ajoute la classe guest
    container.classList.add('guest');
    container.classList.remove('logged');

    loginEl.style.display  = '';
    signupEl.style.display = '';
    dashEl.style.display   = 'none';
    profileEl.style.display= 'none';
    logoutEl.style.display = 'none';
  }

  // clic sur cartes
  document.querySelectorAll('.card').forEach(card => {
    const link = card.dataset.link;
    if (link) card.addEventListener('click', () => window.location.href = link);
  });
  if (window.i18n) window.i18n.apply();
});