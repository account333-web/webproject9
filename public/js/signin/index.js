const params = new URLSearchParams(window.location.search);
const alertBox = document.getElementById('alert');

if (params.has('error')) {
  let txt;
  switch (params.get('error')) {
    case 'missing': txt = '❌ Veuillez remplir tous les champs.'; break;
    case 'invalid': txt = '❌ Identifiants incorrects.'; break;
    case 'server':  txt = '❌ Erreur serveur, réessayez.'; break;
    case 'login':   txt = '❌ Veuillez vous connecter.'; break;
    default:        txt = '❌ Une erreur est survenue.'; break;
  }
  alertBox.textContent = txt;
}

const canvas = document.getElementById("candlestick-bg");
const ctx = canvas.getContext("2d");

// Canvas dédié à la grille
const gridCanvas = document.createElement('canvas');
const gridCtx = gridCanvas.getContext('2d');

// Offscreen pour le dessin principal (bougies + grille)
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');

let candleSpacing = 16;
let candleWidth = 8;
let scrollSpeed = 0.2;

// Facteur de parallaxe pour la grille
let gridParallaxFactor = 0.5;

// Réduction de taille des cellules : 80px (vous pouvez ajuster)
let gridSpacing = 80;

let offsetY = 0;
let lastClose;

// **Déclaration de deux offsets distincts** pour la grille (X horizontal, Y vertical)
let gridOffsetX = 0;
let gridOffsetY = 0;

// Facteur pour la vitesse verticale : la grille montera/descendra plus lentement
let gridVerticalFactor = 0.4;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  offCanvas.width = canvas.width;
  offCanvas.height = canvas.height;

  // On agrandit le gridCanvas pour qu'il couvre l'écran + un pas de grille,
  // tant horizontalement que verticalement :
  gridCanvas.width = canvas.width + gridSpacing;
  gridCanvas.height = canvas.height + gridSpacing;
  drawStaticGrid();

  lastClose = canvas.height / 2;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function drawStaticGrid() {
  gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  gridCtx.beginPath();
  gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  gridCtx.lineWidth = 1;

  // Lignes verticales sur toute la largeur étendue
  for (let x = 0; x < gridCanvas.width; x += gridSpacing) {
    gridCtx.moveTo(x, 0);
    gridCtx.lineTo(x, gridCanvas.height);
  }
  // Lignes horizontales sur toute la hauteur étendue
  for (let y = 0; y < gridCanvas.height; y += gridSpacing) {
    gridCtx.moveTo(0, y);
    gridCtx.lineTo(gridCanvas.width, y);
  }
  gridCtx.stroke();
  gridCtx.closePath();
}

function generateCandle(x) {
  const bodyAmplitude = 150;
  const shadowAmplitude = 30;

  const open = lastClose;
  let close = open + (Math.random() - 0.5) * bodyAmplitude;
  close = Math.max(40, Math.min(canvas.height - 40, close));

  const high = Math.max(open, close) + Math.random() * shadowAmplitude;
  const low = Math.min(open, close) - Math.random() * shadowAmplitude;

  lastClose = close;

  return {
    x,
    open,
    close,
    high: Math.min(canvas.height - 20, high),
    low: Math.max(20, low),
    width: candleWidth,
    alpha: 0,
    color: close >= open ? "#ff4444" : "#33cc66"
  };
}

const candles = [];
for (let x = 0; x < canvas.width + 100; x += candleSpacing) {
  candles.push(generateCandle(x));
}

function drawCandles() {
  // 1) Effacer l'offCanvas
  offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);

  // 2) Mise à jour des offsets X et Y pour la grille
  //    → Horizontale : vitesse pleine (scrollSpeed * gridParallaxFactor)
  gridOffsetX += scrollSpeed * gridParallaxFactor;
  //    → Verticale   : plus lente (on multiplie par gridVerticalFactor)
  gridOffsetY += scrollSpeed * gridParallaxFactor * gridVerticalFactor;

  // Calculer le décalage modulo pour boucler correctement chaque cellule
  const dx = gridOffsetX % gridSpacing;
  const dy = gridOffsetY % gridSpacing;

  // 3) Dessin de la grille (opaquité forcée à 1)
  offCtx.globalAlpha = 0.5;
  offCtx.drawImage(
    gridCanvas,
    -dx,    // offset horizontal
    -dy,    // offset vertical
    gridCanvas.width,
    gridCanvas.height
  );

  // 4) Mise à jour des bougies (déplacement horizontal + fade-in)
  for (let c of candles) {
    c.x -= scrollSpeed;
    if (c.alpha < 1) c.alpha += 0.05;
  }

  const fadeMargin = 300;
  const safeZone = canvas.width * 0.05;
  const fisheyeStrength = 0.5;

  // 5) Dessiner chaque bougie
  for (let c of candles) {
    // 5a) Calcul du scale pour l'effet fisheye
    const distX = Math.abs(c.x - canvas.width / 2);
    let scale = 1;
    if (distX > safeZone) {
      const d = (distX - safeZone) / (canvas.width / 2 - safeZone);
      scale = 1 + fisheyeStrength * d * d;
    }

    // 5b) Calcul de l'alpha final (fade aux bords)
    let alpha = c.alpha;
    if (c.x < fadeMargin) {
      alpha *= c.x / fadeMargin;
    } else if (c.x > canvas.width - fadeMargin) {
      alpha *= (canvas.width - c.x) / fadeMargin;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    // 5c) Mèche
    offCtx.save();
    offCtx.globalAlpha = alpha * 0.7;
    offCtx.beginPath();
    offCtx.strokeStyle = c.color;
    offCtx.lineWidth = 1;
    offCtx.moveTo(c.x + (c.width * scale) / 2, c.high + offsetY);
    offCtx.lineTo(c.x + (c.width * scale) / 2, c.low + offsetY);
    offCtx.stroke();
    offCtx.closePath();
    offCtx.restore();

    // 5d) Corps
    offCtx.save();
    offCtx.globalAlpha = alpha;
    offCtx.fillStyle = c.color;
    const bodyTop = Math.min(c.open, c.close) + offsetY;
    const bodyHeight = Math.max(Math.abs(c.close - c.open), 1) * scale;
    offCtx.fillRect(c.x, bodyTop, c.width * scale, bodyHeight);
    offCtx.restore();
  }

  // 6) Nettoyer les bougies hors-écran et en ajouter si nécessaire
  while (candles.length && candles[0].x + candleWidth < -20) {
    candles.shift();
  }
  if (
    candles.length === 0 ||
    candles[candles.length - 1].x < canvas.width - candleSpacing
  ) {
    const lastX = candles.length
      ? candles[candles.length - 1].x
      : canvas.width;
    candles.push(generateCandle(lastX + candleSpacing));
  }

  // 7) Afficher le résultat sur le canvas principal
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(offCanvas, 0, 0);

  requestAnimationFrame(drawCandles);
}

drawCandles();
