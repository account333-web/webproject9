// ==== CONFIG & ÉTATS ====
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const PADDLE_WIDTH           = 10;
const BASE_PADDLE_HEIGHT     = 100;
const MAX_PADDLE_HEIGHT      = 150;
const HEIGHT_INCREASE_PER_PT = 2;
const PADDLE_MARGIN          = 10;

const BALL_RADIUS            = 10;
const BALL_SPEED             = 7;

// IA
const BASE_AI_SPEED          = 2;
const MAX_AI_SPEED           = 8;
const BASE_AI_ERROR_PROB     = 0.4;
const MIN_AI_ERROR_PROB      = 0.0;

const MIN_KEY_PRESS_INTERVAL = 100; // ms entre deux keydowns

// Vie
const MAX_HEALTH = 5;
let health, score = 0;

// Dynamic Difficulty
let difficultyLevel;

// Positions & vitesses
let leftPaddleY, rightPaddleY;
let ballX, ballY, vx = BALL_SPEED, vy = BALL_SPEED;
let prevX, prevY;
let lastKeyPressTime = 0;
let animationId;
let gameRunning = false;     // Contrôle du cycle de jeu
let pongToken = null;

const EFFECT_THRESHOLDS = {
  background: 15,
  trails:     5,
  particles: 10
};

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

async function csrfFetch(url, options = {}) {
  const token = getCookie('XSRF-TOKEN');
  const headers = options.headers || {};
  headers['Content-Type'] = 'application/json';
  headers['X-XSRF-TOKEN'] = token;
  return csrfFetch(url, { ...options, headers });
}

// ==== UTILITAIRES DOM POUR GAMEOVER ====
// Crée une vraie popup modal CSS
const gameOverModal = document.createElement('div');
gameOverModal.id = 'gameOverModal';
gameOverModal.innerHTML = `
  <style>
    #gameOverModal {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    #gameOverModal .content {
      background: #222;
      color: #fff;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      min-width: 300px;
    }
    #gameOverModal button {
      margin: 10px;
      padding: 10px 20px;
      font-size: 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    #gameOverModal button:hover { opacity: 0.8; }
  </style>
  <div class="content">
    <h2>Game Over !</h2>
    <p id="modalScore"></p>
    <p id="modalReward"></p>
    <button id="restartBtn">Recommencer</button>
    <button id="quitBtn">Quitter</button>
  </div>
`;
document.body.appendChild(gameOverModal);

const modalScoreEl   = document.getElementById('modalScore');
const modalRewardEl  = document.getElementById('modalReward');
const restartBtnEl   = document.getElementById('restartBtn');
const quitBtnEl      = document.getElementById('quitBtn');

// Si le joueur meurt, on arrête tout et affiche modal. La page reste gelée.
restartBtnEl.addEventListener('click', () => window.location.reload());
quitBtnEl.addEventListener('click', () => window.location.href = 'menu.html');

// ==== UTILS ====
function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function getPaddleHeight() {
  return clamp(
    BASE_PADDLE_HEIGHT + score * HEIGHT_INCREASE_PER_PT,
    BASE_PADDLE_HEIGHT,
    MAX_PADDLE_HEIGHT
  );
}

function resetBall(dir = 1) {
  ballX = canvas.width  / 2;
  ballY = canvas.height / 2;
  vx    = BALL_SPEED * dir;
  vy    = BALL_SPEED * (Math.random() < 0.5 ? 1 : -1);
}

function initGame() {
  score = 0;
  health = MAX_HEALTH;
  difficultyLevel = 1;
  initPositions();
}

function initPositions() {
  const h = getPaddleHeight();
  leftPaddleY  = (canvas.height - h) / 2;
  rightPaddleY = leftPaddleY;
  resetBall();
}

// ==== NOUVELLES STRUCTURES DE DONNÉES ====
let trails = [];
let particles = [];

// ==== UTILITAIRES PARTICULES ====
function createParticles(x, y, color, count = 20) {
  const factor = 1 + score * 0.1;
  const total  = Math.round(count * factor);
  for (let i = 0; i < total; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30 + Math.random() * 20,
      color
    });
  }
}

// ==== DESSIN FOND, TRAÎNÉES, PARTICULES & UI ====
let hue = 0;
function drawBackground() {
  hue = (hue + 0.2) % 360;
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, `hsl(${hue}, 50%, 10%)`);
  grad.addColorStop(1, `hsl(${(hue+60)%360}, 50%, 20%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTrails() {
  trails.unshift({ x: ballX, y: ballY });
  if (trails.length > 100) trails.pop();
  trails.forEach((t, i) => {
    ctx.beginPath();
    ctx.arc(
      t.x, t.y,
      BALL_RADIUS * (1 - i / trails.length),
      0, 2 * Math.PI
    );
    ctx.fillStyle = `rgba(255,255,255,${0.1 * (1 - i / trails.length)})`;
    ctx.fill();
  });
}

function drawParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // gravité légère
    p.life--;
  });
}

function draw() {
  // Fond
  if (score >= EFFECT_THRESHOLDS.background) {
    drawBackground();
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Effets
  if (score >= EFFECT_THRESHOLDS.trails)    drawTrails();
  if (score >= EFFECT_THRESHOLDS.particles) drawParticles();

  // Raquettes
  const paddleH = getPaddleHeight();
  ctx.fillStyle = '#fff';
  ctx.fillRect(PADDLE_MARGIN, leftPaddleY, PADDLE_WIDTH, paddleH);
  ctx.fillRect(
    canvas.width - PADDLE_MARGIN - PADDLE_WIDTH,
    rightPaddleY, PADDLE_WIDTH, paddleH
  );

  // Balle
  ctx.beginPath();
  ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // UI (score, diff, vie)
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(
    `Diff: ${difficultyLevel.toFixed(1)}`,
    canvas.width - 120, 30
  );
  const barW = 100, barH = 10;
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(20, 40, barW, barH);
  ctx.fillRect(20, 40, (health / MAX_HEALTH) * barW, barH);
}

// ==== IA & DYNAMIC DIFFICULTY ====
function moveAIPaddle(pY, setP) {
  const paddleH   = getPaddleHeight();
  const aiSpeed   = clamp(BASE_AI_SPEED * difficultyLevel, 0, MAX_AI_SPEED);
  const aiErrProb = clamp(BASE_AI_ERROR_PROB / difficultyLevel, MIN_AI_ERROR_PROB, 1);
  if (Math.random() < aiErrProb) return;

  const offset = (Math.random() - 0.5) * paddleH * 0.8;
  const target = ballY + offset;
  const center = pY + paddleH / 2;
  setP(
    target < center
      ? clamp(pY - aiSpeed, 0, canvas.height - paddleH)
      : clamp(pY + aiSpeed, 0, canvas.height - paddleH)
  );
}

// ==== UPDATE LOOP ====
function update() {
  prevX = ballX; prevY = ballY;
  ballX += vx; ballY += vy;

    // Rebond haut/bas
  if (ballY - BALL_RADIUS <= 0 || ballY + BALL_RADIUS >= canvas.height) {
    vy = -vy;
    ballY = clamp(ballY, BALL_RADIUS, canvas.height - BALL_RADIUS);
  }

  moveAIPaddle(leftPaddleY,  v => leftPaddleY  = v);
  moveAIPaddle(rightPaddleY, v => rightPaddleY = v);

  const paddleH = getPaddleHeight();
    function collide(px, py, color) {
    if (
      ballX + BALL_RADIUS > px &&
      ballX - BALL_RADIUS < px + PADDLE_WIDTH &&
      ballY + BALL_RADIUS > py &&
      ballY - BALL_RADIUS < py + paddleH
    ) {
      vx = -vx;
      // reposition the ball just outside the paddle to avoid repeated collisions
      if (px < canvas.width / 2) {
        ballX = px + PADDLE_WIDTH + BALL_RADIUS;
      } else {
        ballX = px - BALL_RADIUS;
      }
      health = Math.max(health - 1, 0);
      difficultyLevel = clamp(difficultyLevel - 0.05, 0.25, 3);
      createParticles(ballX, ballY, color, 20);
      if (health === 0) endGame();
    }
  }
  collide(PADDLE_MARGIN, leftPaddleY, '#f55');
  collide(
    canvas.width - PADDLE_MARGIN - PADDLE_WIDTH,
    rightPaddleY, '#f55'
  );

  // Point marqué
  if (ballX - BALL_RADIUS < 0 || ballX + BALL_RADIUS > canvas.width) {
    score++;
    health = Math.min(health + 1, MAX_HEALTH);
    difficultyLevel = clamp(difficultyLevel + 0.1, 0.5, 3);
    createParticles(ballX, ballY, 'hsl(120,100%,50%)', 30);
    initPositions();
  }
}

// ==== CONTRÔLE CLAVIER ====
window.addEventListener('keydown', e => {
  const now = performance.now();
  if (now - lastKeyPressTime < MIN_KEY_PRESS_INTERVAL) return;
  lastKeyPressTime = now;
  switch (e.code) {
    case 'ArrowLeft':  vx = -BALL_SPEED; break;
    case 'ArrowRight': vx =  BALL_SPEED; break;
    case 'ArrowUp':    vy = -BALL_SPEED; break;
    case 'ArrowDown':  vy =  BALL_SPEED; break;
  }
});

// ==== BOUCLE & GAME OVER ====
function loop() {
  if (!gameRunning) return;
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

async function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animationId);

  try {
    const resp = await csrfFetch('/api/user/black/pong', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({ score, token: pongToken })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Erreur serveur');
    modalScoreEl.textContent  = `Votre score : ${score}`;
    modalRewardEl.textContent = `Vous gagnez : ${data.reward} ClickCoins. Nouveau solde : ${data.balance} ClickCoins`;
  } catch (err) {
    console.error('Erreur encaissement Pong :', err);
    modalScoreEl.textContent  = `Votre score : ${score}`;
    modalRewardEl.textContent = `Erreur lors de l'envoi du score.`;
  }

  gameOverModal.style.display = 'flex';
}

// ==== DÉMARRAGE APRÈS POPUP ====
const overlay  = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', async () => {
  try {
    const res = await csrfFetch('/api/user/black/pong/token');
    const data = await res.json();
    pongToken = data.token;
    overlay.style.display = 'none';
    initGame();
    gameRunning = true;
    loop();
  } catch (err) {
    alert("Impossible de démarrer la partie (token manquant).");
    console.error('Erreur token Pong :', err);
  }
});
