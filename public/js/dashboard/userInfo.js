import { balanceValue, countryText, companyText } from './constants.js';

export async function loadCurrentUserId() {
  const res = await fetch('/api/user/info', { credentials: 'include' });
  const { id } = await res.json();
  window.currentUserId = id;
  return id;
}

export async function loadUserInfo() {
  const res = await fetch('/api/user/info', { credentials: 'include' });
  if (!res.headers.get('Content-Type')?.includes('application/json')) {
    window.location.href = '/index.html?error=login';
    return;
  }
  const { balance, country, company } = await res.json();
  balanceValue.textContent = `${Math.round(balance).toLocaleString('fr-FR')}`;
  countryText.textContent  = country;
  companyText.textContent  = company;
}