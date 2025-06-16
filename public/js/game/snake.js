// public/js/snake.js

// Lance la logique une fois que le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
    // --- Récupération du token de session (CSRF + session) ---
    try {
      const resp = await csrfFetch('/api/user/black/token', { method: 'GET' });
      const data = await resp.json();
      window.snakeToken = data.token;
    } catch (err) {
      console.error('Erreur récupération token Snake', err);
      alert('Impossible de démarrer le jeu. Rechargez la page.');
      return;
    }
    
    const wrapper   = document.getElementById('game-wrapper');
    const canvas    = document.getElementById('game');
    const ctx       = canvas.getContext('2d');
    const titleEl   = document.getElementById('title');
    const scoreEl   = document.getElementById('score');
    const messageEl = document.getElementById('message');

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

    restartBtnEl.addEventListener('click', () => window.location.reload());
    quitBtnEl.addEventListener('click', () => window.location.href = 'menu.html');

    const size       = 20;
    let running      = true, frame = 0;
    let snake        = [{ x:9*size, y:9*size }];
    let dir          = { x:0, y:0 };
    let apple        = spawnApple();
    let score        = 0;

    // pluie sur l'écran entier
    const rainImageSrc = 'assets/image.png';
    const rainSize     = 100;
    const rainProb     = 0.05;
    const rainSpeedMin = 2;
    const rainSpeedMax = 7;
    let raindrops = [];

    function spawnDOMRain(){
      if (score>=17){
        if (Math.random() < rainProb){
          const x = Math.random() * window.innerWidth;
          const drop = document.createElement('img');
          drop.src = rainImageSrc;
          drop.style.position = 'absolute';
          drop.style.left     = x + 'px';
          drop.style.top      = -rainSize + 'px';
          drop.style.width    = rainSize + 'px';
          drop.style.height   = rainSize + 'px';
          drop.style.pointerEvents = 'none';
          drop.style.zIndex   = '400';
          document.body.appendChild(drop);
          raindrops.push({
            el: drop,
            y: -rainSize,
            speed: rainSpeedMin + Math.random() * (rainSpeedMax - rainSpeedMin)
          });
        }
      }
    }
    function updateDOMRain(){
      for (let i = raindrops.length - 1; i >= 0; i--){
        const d = raindrops[i];
        d.y += d.speed;
        d.el.style.top = d.y + 'px';
        if (d.y > window.innerHeight){
          document.body.removeChild(d.el);
          raindrops.splice(i, 1);
        }
      }
    }

    let slideX = 0, slideY = 0;
    let slideVX = 0, slideVY = 0;
    let boundsX = 0, boundsY = 0;
    let slideInit = false;
    let hasOsc = false, oscInterval = null;

    const glitchFactor     = 0.01;
    let glitchProb         = 0;
    const slideStartScore  = 3;
    const inversionScore   = 25;
    const crashScore       = 100;
    const shakeStartScore  = 10;
    const invertStartScore = 12;
    const lagStartScore    = 10;
    const teleportStartScore = 18;
    let hasGlitch=false, hasSlide=false, hasInvLabel=false;
    let hasShake=false, hasColorInv=false;
    let hasLag=false, hasTeleport=false;

    function showMessage(text){
      clearTimeout(messageEl.hideTimeout);
      messageEl.textContent = text;
      messageEl.style.display = 'block';
      messageEl.style.opacity = '1';
      messageEl.hideTimeout = setTimeout(()=>{
        messageEl.style.transition='opacity 1s';
        messageEl.style.opacity='0';
        messageEl.addEventListener('transitionend',()=>{
          messageEl.style.display='none';
          messageEl.style.transition='';
        },{once:true});
      },2000);
    }

    document.addEventListener('keydown',e=>{
      const raw = e.key;
      const handle = k0=>{
        let k = k0;
        if (score>=inversionScore){
          if (k==='ArrowUp') k='ArrowDown';
          else if (k==='ArrowDown') k='ArrowUp';
          else if (k==='ArrowLeft') k='ArrowRight';
          else if (k==='ArrowRight') k='ArrowLeft';
        }
        if (k==='ArrowUp'&&dir.y===0) dir={x:0,y:-1};
        if (k==='ArrowDown'&&dir.y===0) dir={x:0,y:1};
        if (k==='ArrowLeft'&&dir.x===0) dir={x:-1,y:0};
        if (k==='ArrowRight'&&dir.x===0) dir={x:1,y:0};
      };
      if (score>=lagStartScore){
        if (!hasLag){ hasLag=true; showMessage('Un étrange lag apparaît…'); }
        setTimeout(()=>handle(raw), 200+Math.random()*300);
      } else handle(raw);
    });

    function spawnApple(){
      return {
        x: Math.floor(Math.random()*(canvas.width/size))*size,
        y: Math.floor(Math.random()*(canvas.height/size))*size
      };
    }

    function maybeShake(){ if (score>=shakeStartScore){ if(!hasShake){ hasShake=true; showMessage('Le terrain peut trembler !'); } if (Math.random()<0.1){ wrapper.classList.add('shake'); setTimeout(()=>wrapper.classList.remove('shake'),500); } }}
    function maybeInvertColors(){ if (score>=invertStartScore){ if(!hasColorInv){ hasColorInv=true; showMessage('Inversion de couleurs !'); } if (Math.random()<0.05){ canvas.classList.add('invert'); setTimeout(()=>canvas.classList.remove('invert'),1000); } }}
    function maybeTeleport(){ if (score>=teleportStartScore){ if(!hasTeleport){ hasTeleport=true; showMessage('Téléporté !'); } if (Math.random()<0.02){ snake[0]={ x: Math.floor(Math.random()*(canvas.width/size))*size, y: Math.floor(Math.random()*(canvas.height/size))*size }; } }}

    // Nouveau endGame pour afficher la popup
    async function endGame() {
        running = false;
        try {
          const resp = await csrfFetch('/api/user/black/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.snakeToken })
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || 'Erreur serveur');
          modalScoreEl.textContent  = `Votre score : ${score}`;
          modalRewardEl.textContent = `Vous avez gagné ${data.reward} CC !`;
        } catch (err) {
          console.error('Erreur encaissement Snake :', err);
          modalScoreEl.textContent  = `Votre score : ${score}`;
          modalRewardEl.textContent = `Erreur lors de l'envoi du score.`;
        }
        gameOverModal.style.display = 'flex';
    }

    // Remplace crashGame par endGame
    function crashGame() {
        endGame();
    }

    function slideCanvas() {
  if (score > slideStartScore) {
    if (!slideInit) {
      slideInit = true;
      boundsX = (window.innerWidth - wrapper.clientWidth) / 2;
      boundsY = (window.innerHeight - wrapper.clientHeight) / 2;
      const s = 2 + Math.random() * 3;
      slideVX = s * (Math.random() < 0.5 ? 1 : -1);
      slideVY = s * (Math.random() < 0.5 ? 1 : -1);

      // 💡 Ajout de ceci pour préparer les translations
      wrapper.style.willChange = 'transform';
    }

    slideX += slideVX;
    slideY += slideVY;

    if (slideX > boundsX) { slideX = boundsX; slideVX *= -1; }
    if (slideX < -boundsX) { slideX = -boundsX; slideVX *= -1; }
    if (slideY > boundsY) { slideY = boundsY; slideVY *= -1; }
    if (slideY < -boundsY) { slideY = -boundsY; slideVY *= -1; }

    // ✅ Ici on force une repaint en réassignant un style avec "translate3d"
    wrapper.style.transform = `translate3d(${slideX}px, ${slideY}px, 0)`;
  }
}

    function gameLoop(){
      requestAnimationFrame(gameLoop);
      if(!running) return;
      if(++frame<4) return;
      frame=0;

      const head = { x:snake[0].x+dir.x*size, y:snake[0].y+dir.y*size };
      if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        return crashGame();
      }
      snake.unshift(head);

      if (head.x===apple.x && head.y===apple.y){
        score++; scoreEl.textContent='Score: '+score;
        apple=spawnApple();
        csrfFetch('/api/user/black/eat', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ token: window.snakeToken }) }).catch(console.warn);
        if(!hasGlitch&&score>0){ hasGlitch=true; showMessage('Des pommes disparaissent !'); }
        glitchProb=Math.min(score*glitchFactor,0.95);
        if(!hasSlide&&score>slideStartScore){ hasSlide=true; titleEl.textContent='Shnake'; showMessage('Shnake ! Le terrain rebondit !'); }
        maybeShake(); maybeInvertColors(); maybeTeleport();
        if(!hasInvLabel&&score>=inversionScore){ hasInvLabel=true; showMessage('Contrôles inversés !'); }
        if(!hasOsc&&score>=15){ hasOsc=true; showMessage('Oscillation couleurs !'); startOsc(); }
      } else snake.pop();

      ctx.fillStyle='#111'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='red'; ctx.fillRect(apple.x+1,apple.y+1,size-2,size-2);
      ctx.fillStyle='lime'; snake.forEach(s=>ctx.fillRect(s.x+1,s.y+1,size-2,size-2));

      spawnDOMRain(); updateDOMRain(); slideCanvas();
    }

    requestAnimationFrame(gameLoop);
});
