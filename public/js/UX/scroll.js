const walletWrapper = document.querySelector('.wallet-wrapper');
const CSS         = getComputedStyle(document.documentElement);
// valeurs définies en CSS
const walletHeight         = parseFloat(CSS.getPropertyValue('--wallet-height'));         // 80
const walletHeightShrink   = parseFloat(CSS.getPropertyValue('--wallet-height-shrink'));// 60
const walletPadding        = parseFloat(CSS.getPropertyValue('--wallet-padding'));       // 20
const origRadius           = parseFloat(CSS.getPropertyValue('--radius'));               // 8
const maxBlur = parseFloat(CSS.getPropertyValue('--wallet-blur')); 

// lecture de la valeur max de blur (20px)
const STICKY_THRESHOLD = 40;
const SHRINK_THRESHOLD = 50;
const SHRINK_SCROLL    = SHRINK_THRESHOLD;

wallet.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
const initialMargin = parseFloat(getComputedStyle(wallet).marginLeft);
const rootStyles = getComputedStyle(document.documentElement);
const cardBgVar = getComputedStyle(wallet).getPropertyValue('--card-bg').trim();
const cardBgComputed = getComputedStyle(wallet).backgroundColor; 

function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) {
    hex = hex[0]+hex[0] + hex[1]+hex[1] + hex[2]+hex[2];
  }
  const int = parseInt(hex,16);
  return [(int>>16)&255, (int>>8)&255, int&255];
}

// extrait r,g,b selon le format
let [baseR, baseG, baseB] = [0, 0, 0];
if (cardBgComputed.startsWith('#')) {
  [baseR, baseG, baseB] = hexToRgb(cardBgComputed);
} else {
  [baseR, baseG, baseB] = cardBgComputed.match(/\d+/g).map(Number);
}

let lastScrollY = 0;
let ticking     = false;

window.addEventListener('scroll', () => {
  lastScrollY = window.scrollY;
  if (!ticking) {
    window.requestAnimationFrame(updateWalletOnScroll);
    ticking = true;
  }
});

function updateWalletOnScroll() {
  const y = lastScrollY;

  // Toggle sticky
  if (y > STICKY_THRESHOLD) {
    if (!wallet.classList.contains('sticky')) {
      wallet.classList.add('sticky');
    }
  } else {
    if (wallet.classList.contains('sticky')) {
      wallet.classList.remove('sticky');
      // on remet la margin CSS d’origine (20px)
      wallet.style.margin = '';
      wallet.style.backgroundColor = '';
    }
  }

  // Shrink + width interpolation
  const clamped = Math.min(y, SHRINK_SCROLL);
  const p       = clamped / SHRINK_SCROLL;  // 0→1

  // ---- Hauteur / radius / padding existant ----
  const height  = walletHeight       - (walletHeight       - walletHeightShrink) * p;
  const radius  = origRadius         * (1 - p);
  const padding = walletPadding      * (1 - 0.5 * p);

  wallet.style.height        = `${height}px`;
  walletWrapper.style.height = `${height}px`;
  wallet.style.borderRadius  = `${radius}px`;
  wallet.style.padding       = `0 ${padding}px`;

  const blur = maxBlur * p;                              // 0 → 20px
  wallet.style.backdropFilter        = `blur(${blur}px)`;  
  wallet.style.webkitBackdropFilter  = `blur(${blur}px)`;  
  // fraction d'interpolation p ∈ [0,1] déjà définie
  const alpha = 1 - p;   // 1 → 0
  let raw   = getComputedStyle(wallet).getPropertyValue('--card-bg').trim();
  let [r,g,b] = [0,0,0];
  if (raw.startsWith('#')) {
    [r,g,b] = hexToRgb(raw);
  } else if (raw.startsWith('rgb')) {
    // au cas où on aurait défini --card-bg: rgb(...)
    [r,g,b] = raw.match(/\d+/g).map(Number).slice(0,3);
  } else {
    // fallback sur la computed backgroundColor
    raw = getComputedStyle(wallet).backgroundColor;
    [r,g,b] = raw.match(/\d+/g).map(Number).slice(0,3);
  }
  // applique la couleur interpolée
  // Nouveau (correct) :
  wallet.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;

  const newMargin = initialMargin * (1 - p);
  wallet.style.margin = `0 ${newMargin}px`;

  ticking = false;
}

window.addEventListener('load', updateWalletOnScroll);
// 2) Si vous avez un bouton/toggle JS pour le thème, ajoutez simplement :
document
    const themeToggle = document.querySelector('#theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', updateWalletOnScroll);
    }


