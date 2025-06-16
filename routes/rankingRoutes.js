// routes/rankingRoutes.js
const express = require('express');
const { dbAll } = require('../db');
const checkAuth = require('../middlewares/auth');

const router = express.Router();

// GET /api/rankings/countries
router.get('/countries', checkAuth, async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT name, revenue FROM countries ORDER BY revenue DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Rankings countries error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// GET /api/rankings/companies
router.get('/companies', checkAuth, async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT name, capital FROM companies ORDER BY capital DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Rankings companies error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// GET /api/rankings/players
router.get('/players', checkAuth, async (req, res) => {
  try {
    // On récupère aussi l'ID pour que le front puisse faire playerId = Number(p.id)
    const rows = await dbAll(
      `SELECT
         id,
         username   AS name,
         balance,
         avatar_url
       FROM users
       ORDER BY balance DESC
       LIMIT 10`
    );
    const players = rows.map(r => ({
      id:         r.id,
      name:       r.name,
      balance:    Math.round(r.balance),
      avatar_url: r.avatar_url || '/avatars/default.png'
    }));
    res.json(players);
  } catch (err) {
    console.error('Rankings players error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

module.exports = router;
