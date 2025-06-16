// routes/priceRoutes.js
const express = require('express');
const { dbAll } = require('../db');
const checkAuth = require('../middlewares/auth');

const router = express.Router();

// GET /api/clickcoin/history
router.get('/clickcoin/history', checkAuth, async (req, res) => {
  try {
    const since = req.query.since;
    let rows;
    if (since) {
      rows = await dbAll(
        `SELECT datetime(recorded_at) AS x, open, high, low, close
           FROM price_history
          WHERE asset_type='clickcoin' AND recorded_at >= datetime(?)
          ORDER BY recorded_at ASC`,
        [since]
      );
    } else {
      rows = await dbAll(
        `SELECT datetime(recorded_at) AS x, open, high, low, close
           FROM price_history
          WHERE asset_type='clickcoin'
          ORDER BY recorded_at ASC`
      );
    }
    res.json(rows);
  } catch (err) {
    console.error('Clickcoin history error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// GET /api/companies/history/:id
router.get('/companies/history/:id', checkAuth, async (req, res) => {
  try {
    const since = req.query.since;
    let rows;
    if (since) {
      rows = await dbAll(
        `SELECT datetime(recorded_at) AS x, open, high, low, close
           FROM price_history
          WHERE asset_type='company' AND asset_id = ? AND recorded_at >= datetime(?)
          ORDER BY recorded_at ASC`,
        [req.params.id, since]
      );
    } else {
      rows = await dbAll(
        `SELECT datetime(recorded_at) AS x, open, high, low, close
           FROM price_history
          WHERE asset_type='company' AND asset_id = ?
          ORDER BY recorded_at ASC`,
        [req.params.id]
      );
    }
    res.json(rows);
  } catch (err) {
    console.error('Company history error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

module.exports = router;
