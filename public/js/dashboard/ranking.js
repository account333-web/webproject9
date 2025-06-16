import { appendBadge } from './badges.js';

// Actions dynamiques : entreprises
export function loadRankings() {
  // 1) Pays
  csrfFetch('/api/rankings/countries')
    .then(r => r.json())
    .then(rows => {
      const ol = document.getElementById('ranking-countries');
      ol.innerHTML = '';
      rows.forEach(r => {
        const li = document.createElement('li');
        li.textContent = `${r.name} – ${Math.round(r.revenue).toLocaleString('fr-FR')} CC`;
        ol.appendChild(li);
      });
    })
    .catch(err => console.error('Erreur fetch countries:', err));

  // 2) Entreprises
  csrfFetch('/api/rankings/companies')
    .then(r => r.json())
    .then(rows => {
      const ol = document.getElementById('ranking-companies');
      ol.innerHTML = '';
      rows.forEach(r => {
        const li = document.createElement('li');
        li.textContent = `${r.name} – ${Math.round(r.capital).toLocaleString('fr-FR')} CC`;
        ol.appendChild(li);
      });
    })
    .catch(err => console.error('Erreur fetch companies:', err));

  // 3) Joueurs + badges
  // → On commence par récupérer les badges
  csrfFetch('/api/badges')
    .then(r => r.json())
    .then(badges => {
      // conversion en nombres
      const topTraderId = Number(badges.trader);
      const topSnakeId  = Number(badges.snake);
      const topPongId   = Number(badges.pong);

      // puis on récupère les joueurs
      return csrfFetch('/api/rankings/players')
        .then(r => r.json())
        .then(players => {
          const ol = document.getElementById('ranking-players');
          ol.innerHTML = '';

          players.forEach(p => {
            const playerId = Number(p.id);
            const li = document.createElement('li');
            li.className = 'player-item';
            li.style.display     = 'flex';
            li.style.alignItems  = 'center';
            li.style.gap         = '8px';

            // avatar
            const img = document.createElement('img');
            img.src              = p.avatar_url || '/avatars/default.png';
            img.alt              = `Avatar de ${p.name}`;
            img.classList.add('avatar');
            img.style.width      = '20px';
            img.style.height     = '20px';
            img.style.opacity    = '0.8';
            img.style.objectFit  = 'cover';
            img.style.border     = '1px solid #D1D5DB';
            img.style.borderRadius = '50%';
            li.appendChild(img);

            // pseudo
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('player-name');
            nameSpan.textContent = p.name;
            nameSpan.style.cursor = 'pointer';

            if (topTraderId > 0 && playerId === topTraderId) {
              appendBadge(nameSpan, 'tradeur', 'Tradeur');
            }
            if (topSnakeId  > 0 && playerId === topSnakeId) {
              appendBadge(nameSpan, 'apple-eater', 'Apple Eater');
            }
            if (topPongId   > 0 && playerId === topPongId) {
              appendBadge(nameSpan, 'ball-enjoyer', 'Ball Enjoyer');
            }            

            // badge conditionnel (SEUL le top de chaque catégorie)

            li.appendChild(nameSpan);

            // solde
            const balSpan = document.createElement('span');
            balSpan.classList.add('player-balance');
            balSpan.textContent = ` ${Math.round(p.balance).toLocaleString('fr-FR')}`;
            li.appendChild(balSpan);

            ol.appendChild(li);
          });
        });
    })
    .catch(err => console.error('Erreur fetch badges/players:', err));
}