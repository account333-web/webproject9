// routes/userRoutes.js
const express = require('express');
const multer = require('multer');
const sharp = require('sharp')
const crypto = require('crypto');
const path = require('path');
const { dbGet, dbRun } = require('../db');
const checkAuth = require('../middlewares/auth');

const router = express.Router();

// Téléversement d'avatar PNG → /api/user/avatar
const uploadDir = path.join(__dirname, '../public/avatars');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype)) cb(null, true);
      else cb(new Error('Format d\'image non supporté'));
    }
});

router.post('/avatar', checkAuth, (req, res) => {
  upload.single('avatar')(req, res, async err => {
    if (err) {
      console.error('Avatar upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    // Ré-encodage sécurisé au format PNG
    const filename = `${req.session.userId}.png`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 256, height: 256, fit: 'cover' })
      .png({ quality: 90 })
      .toFile(filepath);
    const avatarUrl = `/avatars/${filename}`;
    
    try {
      await dbRun('UPDATE users SET avatar_url = ? WHERE id = ?', [
        avatarUrl,
        req.session.userId
      ]);
      res.json({ avatarUrl });
    } catch (dbErr) {
      console.error('DB error:', dbErr);
      res.status(500).json({ error: 'db_error' });
    }
  });
});

// GET /api/user/info
router.get('/info', checkAuth, async (req, res) => {
  try {
    const row = await dbGet(
      `SELECT u.id, u.username, u.balance, u.country, u.company_id, u.avatar_url, c.name AS company
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?`,
    [req.session.userId]
    );

        const roundedBal = Math.round(row.balance);
    // Si le solde diffère de plus de 0,5 de l'arrondi, on corrige pour garder la base cohérente
    if (roundedBal !== row.balance) {
      await dbRun('UPDATE users SET balance = ? WHERE id = ?', [ roundedBal, req.session.userId ]);
    }

    res.json({
      id:         row.id,
      username:   row.username,
      balance:    roundedBal,
      country:    row.country   || 'Sans abris',
      company:    row.company   || 'Au chômage',
      avatar_url: row.avatar_url || '/avatars/default.png'
    });
  } catch (err) {
    console.error('User info error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

router.post('/company', checkAuth, async (req, res) => {
  const { companyId } = req.body;
  const COOLDOWN = 30 * 60 * 1000; // 1 heure

  try {
    // Lecture des informations de l'utilisateur
    const user = await dbGet(
      'SELECT company_id, last_company_change FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!user) return res.status(500).json({ error: 'db_error' });

    const now = Date.now();
    if (user.last_company_change && now - user.last_company_change < COOLDOWN) {
      return res.status(429).json({ error: 'change_too_frequent' });
    }

    const newCompany = await dbGet(
      'SELECT id FROM companies WHERE id = ?',
      [companyId]
    );
    if (!newCompany) {
      return res.status(400).json({ error: 'invalid_company' });
    }

    // Mise à jour de l'utilisateur
    await dbRun(
      'UPDATE users SET company_id = ?, last_company_change = ? WHERE id = ?',
      [companyId, now, req.session.userId]
    );

    // Actualisation du nombre d'employés
    await dbRun(
      'UPDATE companies SET employees_count = employees_count + 1 WHERE id = ?',
      [companyId]
    );
    if (user.company_id) {
      await dbRun(
        'UPDATE companies SET employees_count = employees_count - 1 WHERE id = ?',
        [user.company_id]
      );
    }

    res.json({ success: true, oldCompanyId: user.company_id });
  } catch (err) {
    console.error('User company update error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// POST /api/user/country : changement de pays
router.post('/country', checkAuth, async (req, res) => {
  const { countryId } = req.body;
  const COOLDOWN = 60 * 60 * 1000; // 1 heure
  try {
    // Vérifier si l'utilisateur peut changer de pays
    const user = await dbGet('SELECT balance, last_country_change FROM users WHERE id=?', [req.session.userId]);
    if (user.last_country_change && (Date.now() - user.last_country_change < COOLDOWN)) {
      return res.status(429).json({ error: 'change_too_frequent' });
    }
    const country = await dbGet('SELECT entry_fee, housing_cost FROM countries WHERE id=?', [countryId]);
    if (!country) return res.status(400).json({ error: 'invalid_country' });
  
    const total = country.entry_fee + country.housing_cost;
    if (user.balance < total) return res.status(400).json({ error: 'insufficient_balance' });
  
    await dbRun(
      'UPDATE users SET balance = balance - ?, country = (SELECT name FROM countries WHERE id=?), last_country_change=? WHERE id=?',
      [total, countryId, Date.now(), req.session.userId]
    );
    await dbRun('UPDATE countries SET revenue = revenue + ? WHERE id=?', [total, countryId]);
  
    res.json({ success: true });
  } catch (err) {
    console.error('User country update error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// 1) Génération d’un token de partie
router.get('/black/token', checkAuth, async (req, res) => {
    try {
      const token = crypto.randomBytes(16).toString('hex');
      await dbRun(
        'INSERT INTO snake_sessions(token, user_id) VALUES(?, ?)',
        [token, req.session.userId]
      );
      res.json({ token });
    } catch (err) {
      console.error('Erreur création token snake:', err);
      res.status(500).json({ error: 'db_error' });
    }
  });
  
  // --- Validation de la partie Snake ---
router.post('/black', checkAuth, async (req, res) => {
  const { score, token } = req.body;
  const currentScore = parseInt(score, 10);
  if (!token || isNaN(currentScore) || currentScore < 0) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  try {
    // Vérifier le token
    const session = await dbGet(
      'SELECT id, used FROM snake_sessions WHERE token = ? AND user_id = ?',
      [token, req.session.userId]
    );
    if (!session)      return res.status(400).json({ error: 'invalid_token' });
    if (session.used)  return res.status(400).json({ error: 'token_used' });

    const reward = currentScore * 100;

    // DÉBUT TRANSACTION
    await dbRun('BEGIN TRANSACTION');

    // 1) Mise à jour du solde et du meilleur score
    await dbRun(
      `UPDATE users
         SET balance = balance + ?,
             snake_best_score = MAX(snake_best_score, ?)
       WHERE id = ?`,
      [reward, currentScore, req.session.userId]
    );

    // 2) Marquer la session comme consommée
    await dbRun(
      'UPDATE snake_sessions SET used = 1 WHERE id = ?',
      [session.id]
    );

    // COMMIT si tout est OK
    await dbRun('COMMIT');

    // Récupérer le nouveau solde
    const { balance } = await dbGet(
      'SELECT balance FROM users WHERE id = ?',
      [req.session.userId]
    );
    return res.json({ reward, balance });
  } catch (err) {
    // Annule la transaction en cas d'erreur
    await dbRun('ROLLBACK');
    console.error('Erreur encaissement Snake :', err);
    return res.status(500).json({ error: 'db_error' });
  }
});
  
  // 1) Lorsqu'une pomme est mangée
router.post('/black/eat', checkAuth, async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'invalid_request' });
  
    const session = await dbGet(
      `SELECT id, used, apple_count, last_eat
         FROM snake_sessions
        WHERE token = ? AND user_id = ?`,
      [token, req.session.userId]
    );
    if (!session)      return res.status(400).json({ error: 'invalid_token' });
    if (session.used)  return res.status(400).json({ error: 'token_used' });
  
    const now = Date.now();
    // Throttle : au moins 100 ms entre deux /eat
    if (session.last_eat && now - session.last_eat < 100) {
      return res.status(429).json({ error: 'too_many_requests' });
    }
  
    // On incrémente apple_count et met à jour last_eat
    await dbRun(
      `UPDATE snake_sessions
          SET apple_count = apple_count + 1,
              last_eat     = ?
        WHERE id = ?`,
      [now, session.id]
    );
  
    res.json({ apple_count: session.apple_count + 1 });
  });
  
  // 2) À la fin du jeu on n'envoie plus le score, uniquement le token
  router.post('/black/finish', checkAuth, async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'invalid_request' });
  
    const session = await dbGet(
      `SELECT id, used, apple_count
         FROM snake_sessions
        WHERE token = ? AND user_id = ?`,
      [token, req.session.userId]
    );
    if (!session)      return res.status(400).json({ error: 'invalid_token' });
    if (session.used)  return res.status(400).json({ error: 'token_used' });
  
    const count  = session.apple_count;
    const reward = count * 100;
  
    // Mise à jour de l’utilisateur
    await dbRun(
      `UPDATE users
          SET balance           = balance + ?,
              snake_best_score  = MAX(snake_best_score, ?)
        WHERE id = ?`,
      [reward, count, req.session.userId]
    );
    await dbRun(
      `UPDATE snake_sessions
          SET used = 1
        WHERE id = ?`,
      [session.id]
    );
  
    const { balance } = await dbGet(
      `SELECT balance FROM users WHERE id = ?`,
      [req.session.userId]
    );
    res.json({ reward, balance });
  });
  
// Génération d'un jeton pour le Pong
router.get('/black/pong/token', checkAuth, async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    await dbRun(
      'INSERT INTO pong_sessions(token, user_id, start_time) VALUES(?, ?, ?)',
      [token, req.session.userId, Date.now()]
    );
    res.json({ token });
  } catch (err) {
    console.error('Erreur création token pong:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// --- Validation de la partie Pong ---
router.post('/black/pong', checkAuth, async (req, res) => {
  const { score, token } = req.body;
  const s = parseInt(score, 10);
  if (!token || isNaN(s) || s < 0) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  if (s > 100) {
    return res.status(400).json({ error: 'et_non_jeune_homme' });
  }
  try {
    // Vérifier le token et que la session existe
    const session = await dbGet(
      'SELECT id, used, start_time FROM pong_sessions WHERE token = ? AND user_id = ?',
      [token, req.session.userId]
    );
    if (!session)      return res.status(400).json({ error: 'invalid_token' });
    if (session.used)  return res.status(400).json({ error: 'token_used' });

    // Vérifier une durée minimale de partie (ex: 10s)
    if (Date.now() - session.start_time < 10000) {
      return res.status(400).json({ error: 'game_too_short' });
    }

    const reward = s * 100;

    // DÉBUT TRANSACTION
    await dbRun('BEGIN TRANSACTION');

    // 1) Mise à jour du solde et meilleur score
    await dbRun(
      `UPDATE users
         SET balance = balance + ?,
             pong_best_score = MAX(pong_best_score, ?)
       WHERE id = ?`,
      [reward, s, req.session.userId]
    );

    // 2) Marquer la session comme consommée
    await dbRun(
      'UPDATE pong_sessions SET used = 1 WHERE id = ?',
      [session.id]
    );

    // COMMIT si tout est OK
    await dbRun('COMMIT');

    // Récupérer le nouveau solde
    const { balance } = await dbGet(
      'SELECT balance FROM users WHERE id = ?',
      [req.session.userId]
    );
    return res.json({ reward, balance });
  } catch (err) {
    // Annule la transaction en cas d'erreur
    await dbRun('ROLLBACK');
    console.error('Erreur encaissement Pong :', err);
    return res.status(500).json({ error: 'db_error' });
  }
});

// GET /api/user/rank
router.get('/rank', checkAuth, async (req, res) => {
  try {
    const row = await dbGet(
      `SELECT COUNT(*) + 1 AS rank
         FROM users
        WHERE balance > (SELECT balance FROM users WHERE id = ?)`,
      [req.session.userId]
    );
    res.json({ rank: row.rank });
  } catch (err) {
    console.error('User rank error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

module.exports = router;
