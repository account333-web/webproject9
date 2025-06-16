// public/js/country.js
import { loadUserInfo } from './userInfo.js';
import { showErrorToast, showSuccessToast } from '../UX/toast.js';

export function loadCountries() {
  csrfFetch('/api/countries')
    .then(r => r.json())
    .then(cs => {
      const track = document.getElementById('country-track');
      track.innerHTML = '';

      cs.forEach(c => {
        const li = document.createElement('li');
        li.className = 'carousel-item';

        const card = document.createElement('div');
        card.className = 'country-card';

        const title = document.createElement('h3');
        title.textContent = c.name;
        card.appendChild(title);

        const details = document.createElement('div');
        details.className = 'country-details';
        [
          `Impôts : ${(c.tax_rate * 100).toFixed(0)}%`,
          `Logement : ${c.housing_cost} CC/mois`,
          `Taxe d'entrée : ${c.entry_fee} CC`,
          `Trésorerie : ${c.revenue} CC`
        ].forEach(text => {
          const p = document.createElement('p');
          p.textContent = text;
          details.appendChild(p);
        });
        card.appendChild(details);

        const actions = document.createElement('div');
        actions.className = 'actions';
        const btn = document.createElement('button');
        btn.classList.add('btn');
        btn.dataset.id = c.id;
        btn.textContent = 'Déménager';
        
        // Désactiver le bouton pendant le chargement
        let isProcessing = false;
        
        btn.addEventListener('click', async () => {
          if (isProcessing) return;
          
          try {
            isProcessing = true;
            btn.disabled = true;
            btn.textContent = 'Chargement...';

            const response = await csrfFetch('/api/user/country', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                countryId: parseInt(c.id, 10) // Assurez-vous que l'ID est un nombre
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              
              if (response.status === 429) {
                showErrorToast('Vous ne pouvez changer de pays qu\'une fois toutes les 30 minutes.');
              } else if (response.status === 400) {
                showErrorToast(errorData.message || 'Données invalides. Veuillez réessayer.');
              } else if (response.status === 403) {
                showErrorToast('Vous n\'avez pas les fonds nécessaires pour déménager.');
              } else {
                showErrorToast(`Erreur ${response.status} : ${errorData.message || response.statusText}`);
              }
              throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Recharger les infos utilisateur et la liste des pays
            await Promise.all([
              loadUserInfo(),
              loadCountries()
            ]);
            
            if (window.removeSkeletons) {
              window.removeSkeletons();
            }
            
            showSuccessToast('Déménagement réussi !');
          } catch (err) {
            console.error('Erreur lors du déménagement:', err);
          } finally {
            isProcessing = false;
            btn.disabled = false;
            btn.textContent = 'Déménager';
          }
        });
        
        actions.appendChild(btn);
        card.appendChild(actions);

        li.appendChild(card);
        track.appendChild(li);
      });

      // Signaler que la liste des pays est prête pour mettre 
      // à jour le carrousel (nombre d'éléments, boutons, etc.)
      document.dispatchEvent(new Event('countriesUpdated'));
    })
    .catch(err => {
      console.error('Erreur en récupérant les pays :', err);
      showErrorToast('Impossible de charger la liste des pays. Veuillez réessayer.');
    });
}