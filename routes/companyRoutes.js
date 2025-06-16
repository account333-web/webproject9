// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const { dbGet, dbRun, dbAll, rawDb } = require('../db');
const checkAuth = require('../middlewares/auth');

// GET /api/companies
router.get('/', checkAuth, async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT c.id, c.name, c.capital, c.salary_offered, c.owner_id,
       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS employees_count
        FROM companies c`
    );
    res.json(rows);
  } catch (err) {
    console.error('Companies error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// POST /api/companies (create new company)
router.post('/', checkAuth, async (req, res) => {
  const { name, salary } = req.body;
  const sal = parseInt(salary, 10);
  if (!name || isNaN(sal) || sal < 0) {
    return res.status(400).json({ error: 'invalid' });
  }
  try {
    const u = await dbGet('SELECT balance FROM users WHERE id = ?', [req.session.userId]);
    if (!u || u.balance < 1000) {
      return res.status(!u ? 500 : 400).json({ error: !u ? 'db_error' : 'insufficient_balance' });
    }
    await new Promise((resolve, reject) => {
      rawDb.run(
        'INSERT INTO companies(name, salary_offered, capital, owner_id) VALUES (?, ?, 1000, ?)',
        [name, sal, req.session.userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }).then(async (lastID) => {
      if (!lastID) {
        return res.status(500).json({ error: 'db_error' });
      }
      await dbRun('UPDATE companies SET shares_outstanding = 1000 WHERE id = ?', [lastID]);
      await dbRun(
        'UPDATE users SET balance = balance - 1000, company_id = ? WHERE id = ?',
        [lastID, req.session.userId]
      );
      res.json({ success: true, companyId: lastID });
    }).catch((err) => {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'exists' });
      } else {
        console.error('Create company error:', err);
        res.status(500).json({ error: 'db_error' });
      }
    });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// POST /api/companies/:id/salary (update salary offered)
router.post('/:id/salary', checkAuth, async (req, res) => {
  const companyId = req.params.id;
  const { salary } = req.body;
  const sal = parseInt(salary, 10);
  if (isNaN(sal) || sal < 0) {
    return res.status(400).json({ error: 'invalid_salary' });
  }
  try {
    const company = await dbGet('SELECT owner_id FROM companies WHERE id = ?', [companyId]);
    if (!company) return res.status(404).json({ error: 'company_not_found' });
    if (company.owner_id !== req.session.userId) return res.status(403).json({ error: 'forbidden' });

    await dbRun('UPDATE companies SET salary_offered = ? WHERE id = ?', [sal, companyId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update salary error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// POST /api/companies/:id/name (rename company)
router.post('/:id/name', checkAuth, async (req, res) => {
  const companyId = req.params.id;
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'invalid_name' });
  }
  try {
    const company = await dbGet('SELECT owner_id FROM companies WHERE id = ?', [companyId]);
    if (!company) return res.status(404).json({ error: 'company_not_found' });
    if (company.owner_id !== req.session.userId) return res.status(403).json({ error: 'forbidden' });

    const existing = await dbGet(
      'SELECT id FROM companies WHERE name = ? AND id <> ?',
      [name, companyId]
    );
    if (existing) {
      return res.status(400).json({ error: 'name_exists' });
    }

    await dbRun('UPDATE companies SET name = ? WHERE id = ?', [name, companyId]);
    await dbRun(
      'UPDATE users SET company = ? WHERE company = (SELECT name FROM companies WHERE id = ?)',
      [name, companyId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update name error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

// DELETE /api/companies/:id (delete company and liquidate positions)
router.delete('/:id', checkAuth, async (req, res) => {
  const companyId = req.params.id;
  try {
    const company = await dbGet(
      'SELECT owner_id, capital, name FROM companies WHERE id = ?',
      [companyId]
    );
    if (!company) return res.status(404).json({ error: 'company_not_found' });
    if (company.owner_id !== req.session.userId) return res.status(403).json({ error: 'forbidden' });

    const assetCode = `company-${companyId}`;

    // Récupérer le dernier prix
    const priceRow = await dbGet(
      `SELECT close
         FROM price_history
        WHERE asset_type = ?
          AND asset_id   = ?
        ORDER BY recorded_at DESC
        LIMIT 1`,
      ['company', companyId]
    );
    const currentPrice = priceRow ? priceRow.close : 0;

    // Liquidation forcée
    const trades = await dbAll(
      'SELECT user_id, quantity FROM trades WHERE asset_code = ?',
      [assetCode]
    );
    const liquidationByUser = trades.reduce((acc, { user_id, quantity }) => {
      acc[user_id] = (acc[user_id] || 0) + quantity * currentPrice;
      return acc;
    }, {});

    for (const [userId, exitValue] of Object.entries(liquidationByUser)) {
      const roundedValue = Math.round(exitValue);
      await dbRun(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [roundedValue, userId]
      );
    }

    await dbRun('DELETE FROM trades WHERE asset_code = ?', [assetCode]);
    await dbRun(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [company.capital, company.owner_id]
    );
    await dbRun(
      'UPDATE users SET company = NULL WHERE company = ?',
      [company.name]
    );
    await dbRun('DELETE FROM companies WHERE id = ?', [companyId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: 'db_error' });
  }
});

module.exports = router;
