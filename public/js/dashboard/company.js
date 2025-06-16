import { loadUserInfo } from './userInfo.js';

// Création d'entreprise
document.getElementById('create-company-btn').addEventListener('click', () => {
  let name = prompt('Nom de la nouvelle entreprise ? (cout : 1000 CC)');
  if (!name) return;
  name = name.trim().replace(/[<"">]/g, '');  // <<<<<< SÉCURISATION
  const salary = parseInt(prompt('Salaire proposé (en CC) ? (cout : 1000 CC)'), 10);
  if (isNaN(salary) || salary < 0) {
    return alert('Salaire invalide : veuillez entrer un nombre positif.');
  }
  csrfFetch('/api/companies', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name, salary })
  })
  .then(res => {
    if (!res.ok) throw new Error('Impossible de créer l’entreprise');
    return res.json();
  })
  .then(() => { loadCompanies(); loadUserInfo(); })
  .catch(err => alert(err.message));
});

// Modified loadCompanies to wait for currentUserId before rendering
export async function loadCompanies() {
  if (!window.currentUserId) {
    await loadCurrentUserId();
  }
  csrfFetch('/api/companies')
  .then(r => r.json())
  .then(cs => {
    const ul = document.getElementById('companies-list');
    ul.innerHTML = '';
    cs.forEach(c => {
      const li = document.createElement('li');
      const isOwner = c.owner_id === window.currentUserId;

      const header = document.createElement('div');
      header.className = 'item-header';
      const name = document.createElement('span');
      name.textContent = c.name;
      header.appendChild(name);

      const acts = document.createElement('div');
      acts.className = 'actions';
      if (isOwner) {
        const setBtn = document.createElement('button');
        setBtn.className = 'settings-btn';
        setBtn.dataset.id = c.id;
        setBtn.textContent = 'Paramètres';
        acts.appendChild(setBtn);
        setBtn.addEventListener('click', () => openSettingsModal(c));
      } else {
        const joinBtn = document.createElement('button');
        joinBtn.className = 'join-btn';
        joinBtn.dataset.id = c.id;
        joinBtn.textContent = 'Rejoindre';
        acts.appendChild(joinBtn);
        joinBtn.addEventListener('click', () => {
          csrfFetch('/api/user/company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: c.id })
          })
          .then(res => {
            if (!res.ok) {
              // Affiche un toast d'erreur si le statut HTTP n'est pas OK
              return res.json().then(err => {
                showErrorToast(err.message || `Erreur ${res.status}`);
                throw new Error(err.message || `HTTP ${res.status}`);
              });
            }
            return res.json();
          })
          .then(({ success, oldCompany }) => {
            if (success) {
              // Toast vert de succès
              showSuccessToast(
                oldCompany
                  ? `Vous avez quitté ${oldCompany} et rejoint ${c.name} !`
                  : `Vous avez rejoint ${c.name} !`
              );
              loadUserInfo();
              loadCompanies();
            } else {
              // En cas d'échec côté API
              showErrorToast(`Impossible de rejoindre ${c.name}`);
            }
          })
          .catch(err => {
            showErrorToast('Vous ne pouvez changer d\'entreprise qu\'une fois toutes les 30 minutes');
          });
        });
      }
      header.appendChild(acts);

      const details = document.createElement('div');
      details.className = 'item-details';
      [
        `Employés : ${c.employees_count}`,
        `Capital : ${c.capital} CC`,
        `Salaire : ${c.salary_offered} CC`
      ].forEach(t => {
        const s = document.createElement('span');
        s.textContent = t;
        details.appendChild(s);
      });

      li.appendChild(header);
      li.appendChild(details);
      ul.appendChild(li);
    });
  });
}

// Settings modal creation and logic remains unchanged
export function openSettingsModal(company) {
  // Create modal overlay
  let overlay = document.getElementById('settings-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'settings-modal-overlay';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }

  // Create modal container
  let modal = document.getElementById('settings-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.className = 'modal-container';
    overlay.appendChild(modal);
  }
  modal.innerHTML = `
    <h3>Paramètres de ${company.name}</h3>
    <div class="form-group">
      <label for="company-name-input">Nom:</label>
      <input class="form-control" type="text" id="company-name-input" value="${company.name}">
    </div>
    <div class="form-group">
      <label for="company-salary-input">Salaire:</label>
      <input class="form-control" type="number" id="company-salary-input" value="${company.salary_offered}">
    </div>
    <div class="modal-buttons">
      <button id="save-settings-btn" class="btn">Enregistrer</button>
      <button id="delete-company-btn" class="btn btn-danger">Supprimer</button>
      <button id="cancel-settings-btn" class="btn btn-cancel">Annuler</button>
    </div>
  `;

  // Save button event
  modal.querySelector('#save-settings-btn').onclick = () => {
    let newName = modal.querySelector('#company-name-input').value.trim();
    const newSalary = parseInt(modal.querySelector('#company-salary-input').value, 10);
    
    if (!newName) {
      alert('Le nom de l\'entreprise ne peut pas être vide.');
      return;
    }
  
    newName = newName.replace(/[<"">]/g, '');  // <<<<<< SÉCURISATION ICI
  
    if (isNaN(newSalary) || newSalary < 0) {
      alert('Le salaire doit être un nombre positif.');
      return;
    }
    // Update name if changed
    const promises = [];
    if (newName !== company.name) {
      promises.push(
        csrfFetch(`/api/companies/${company.id}/name`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ name: newName })
        }).then(res => {
          if (!res.ok) throw new Error('Erreur lors de la mise à jour du nom');
          return res.json();
        })
      );
    }
    // Update salary if changed
    if (newSalary !== company.salary_offered) {
      promises.push(
        csrfFetch(`/api/companies/${company.id}/salary`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ salary: newSalary })
        }).then(res => {
          if (!res.ok) throw new Error('Erreur lors de la mise à jour du salaire');
          return res.json();
        })
      );
    }
    Promise.all(promises)
      .then(() => {
        alert('Paramètres mis à jour avec succès.');
        closeSettingsModal();
        loadCompanies();
      })
      .catch(err => alert(err.message));
  };

  // Delete button event
  modal.querySelector('#delete-company-btn').onclick = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${company.name}" ? Cette action est irréversible.`)) {
      csrfFetch(`/api/companies/${company.id}`, {
        method: 'DELETE'
      })
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors de la suppression de l\'entreprise');
        return res.json();
      })
      .then(() => {
        alert('Entreprise supprimée avec succès.');
        closeSettingsModal();
        loadUserInfo();
        loadCompanies();
      })
      .catch(err => alert(err.message));
    }
  };

  // Cancel button event
  modal.querySelector('#cancel-settings-btn').onclick = () => {
    closeSettingsModal();
  };
}

export function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const overlay = document.getElementById('settings-modal-overlay');
  
  if (modal) modal.remove();
  if (overlay) overlay.remove();
}