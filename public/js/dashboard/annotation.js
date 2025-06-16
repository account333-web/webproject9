import { priceText, priceValue, changeText, changeValue, dateText, dateValue, balanceValue } from './constants.js';

export async function annotatePrice() {
  const res = await fetch('/api/price', { credentials: 'include' });
  const { price, change, date } = await res.json();
  priceText.textContent  = 'Prix TTC';
  priceValue.textContent = price.toFixed(2);
  changeText.textContent = change>=0?'Hausse':'Baisse';
  changeValue.textContent= `${change.toFixed(2)} %`;
  dateText.textContent   = 'Mise à jour';
  dateValue.textContent  = new Date(date).toLocaleTimeString();
  if (balanceValue) balanceValue.textContent = (parseFloat(balanceValue.textContent)+price).toFixed(2);
}
