/**
 * Ajoute un badge stylé à côté d’un élément parent (span pseudo)
 * @param {HTMLElement} parentEl — élément auquel on va append le badge
 * @param {string} type — suffixe de classe (ex: 'tradeur')
 * @param {string} label — texte du badge
 */
export function appendBadge(parentEl, type, label) {
  const b = document.createElement('span');
  b.classList.add('badge', `badge-${type}`);
  b.textContent = label;
  parentEl.appendChild(b);
}