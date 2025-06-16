const express = require('express');
const bcrypt  = require('bcrypt');
const crypto  = require('crypto');
const { dbGet, dbRun } = require('../db');

const router = express.Router();

// Map pseudo ou IP → { count, lastFailureTime, lockedUntil }
const loginFailures = {};

// Captcha conservé en mémoire : id → { answer, created }
const captchaStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, c] of captchaStore.entries()) {
    if (now - c.created > 5 * 60 * 1000) captchaStore.delete(id);
  }
}, 60 * 1000);

const MAX_FAILURES = 5;
const LOCK_TIME = 5 * 60 * 1000; // 5 minutes

function loginRateLimiter(req, res, next) {
  const key = req.body.pseudo || req.ip;
  const record = loginFailures[key];
  const now = Date.now();

  if (record && record.lockedUntil && now < record.lockedUntil) {
    return res.status(429).send('Compte temporairement verrouillé, réessayez plus tard.');
  }
  next();
}

router.post('/login', loginRateLimiter, async (req, res) => {
  const { pseudo, password } = req.body;
  const key = pseudo || req.ip;
  if (!pseudo || !password) {
    return res.redirect('/index.html?error=missing');
  }
  try {
    const row = await dbGet(
      'SELECT id,password_hash FROM users WHERE username=?',
      [pseudo]
    );
    if (!row) {
      recordFailure(key);
      return res.redirect('/index.html?error=invalid');
    }
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      recordFailure(key);
      return res.redirect('/index.html?error=invalid');
    }
    // Réussite : réinitialisation des échecs
    if (loginFailures[key]) delete loginFailures[key];
    req.session.userId = row.id;
    req.session.username = pseudo;
    res.redirect('/menu.html');
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/index.html?error=server');
  }
});

function recordFailure(key) {
  const now = Date.now();
  if (!loginFailures[key]) {
    loginFailures[key] = { count: 1, lastFailureTime: now };
  } else {
    loginFailures[key].count++;
    loginFailures[key].lastFailureTime = now;
  }
  if (loginFailures[key].count >= MAX_FAILURES) {
    loginFailures[key].lockedUntil = now + LOCK_TIME;
    console.warn(`Verrouillage temporaire du compte/IP ${key}`);
  }
}

async function verifyCaptcha(token, remoteIp) {
  const secret = "6LeMsmArAAAAAHEKV3AILUNA2sj_-cTKYYLoFS34";
  if (!secret) return true;
  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await resp.json();
    return data.success === true;
  } catch (err) {
    console.error('Captcha verification failed:', err);
    return false;
  }
}

// GET /api/captcha — renvoie { id, question }
router.get('/api/captcha', (_req, res) => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const id = crypto.randomBytes(8).toString('hex');
  captchaStore.set(id, { answer: a + b, created: Date.now() });
  res.json({ id, question: `Combien font ${a} + ${b} ?` });
});

// POST /signup
router.post('/signup', async (req, res) => {
  const { pseudo, password } = req.body;
  const token = req.body['g-recaptcha-response'];
  if (!pseudo || !password || !token) {
    return res.redirect('/signup.html?error=missing');
  }
  const ok = await verifyCaptcha(token, req.ip);
  if (!ok) {
    return res.redirect('/signup.html?error=captcha');
  }
  // Limite la longueur du pseudo à 8 caractères
  if (pseudo.length > 8) {
    return res.redirect('/signup.html?error=length');
  }
  // Interdit les caractères cyrilliques dans le pseudo
  if (/[\u0400-\u04FF]/.test(pseudo)) {
    return res.redirect('/signup.html?error=invalidchars');
  }
  // Limite la longueur du mot de passe à 20 caractères
  if (password.length > 20) {
    return res.redirect('/signup.html?error=pwdlength');
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await dbRun(
      'INSERT INTO users(username,password_hash,balance) VALUES(?,?,10000)',
      [pseudo, hash]
    );
    const user = await dbGet('SELECT id FROM users WHERE username=?', [pseudo]);
    req.session.userId = user.id;
    req.session.username = pseudo;
    res.redirect('/menu.html');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.redirect('/signup.html?error=exists');
    } else {
      console.error('Signup error:', err);
      res.redirect('/signup.html?error=server');
    }
  }
});

module.exports = router;
