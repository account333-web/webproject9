    // Navigation buttons
    document.getElementById('menu-btn').addEventListener('click', () => {
      window.location.href = '/menu.html';
    });
    document.getElementById('logout-btn').addEventListener('click', () => {
      csrfFetch('/logout', { method: 'POST' }).then(() => window.location.href = '/index.html');
    });

    // Fetch user info
    csrfFetch('/api/user/info')
      .then(res => res.json())
      .then(({ balance, country, company, avatar_url }) => {
        document.getElementById('user-balance').textContent = `💰 ${balance} CC`;
        document.getElementById('user-country').textContent = country;
        document.getElementById('user-company').textContent = company;
        if (avatar_url) {
          document.getElementById('avatar-preview').src = `${avatar_url}?v=${Date.now()}`;
        }
      });

    // Upload avatar
    const avatarForm = document.getElementById('avatar-form');
    avatarForm.addEventListener('submit', async e => {
      e.preventDefault();
      const input = document.getElementById('avatar-input');
      if (!input.files.length) return;
      const formData = new FormData();
      formData.append('avatar', input.files[0]);
      try {
        const res = await csrfFetch('/api/user/avatar', { method: 'POST', body: formData });
        if (!res.ok) throw new Error();
        const { avatarUrl } = await res.json();
        document.getElementById('avatar-preview').src = `${avatarUrl}?v=${Date.now()}`;
        alert('Avatar mis à jour !');
      } catch {
        alert('Erreur lors de l\'upload');
      }
    });

    // Fetch investments and render chart
    /*
    csrfFetch('/api/user/investments')
      .then(res => res.json())
      .then(data => {
        const ctx = document.getElementById('transactions-chart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.map(item => new Date(item.date).toLocaleDateString()),
            datasets: [{ label: 'Valeur (CC)', data: data.map(item => item.value), fill: false, tension: 0.3 }]
          },
          options: { responsive: true, plugins: { legend: { display: false } } }
        });
        const tbody = document.getElementById('investments-body');
        data.forEach(item => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${new Date(item.date).toLocaleDateString()}</td><td>${item.percentage}%</td><td>${item.value}</td>`;
          tbody.appendChild(tr);
        });
      }); */
