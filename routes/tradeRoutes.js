// routes/tradeRoutes.js
const express = require('express');
const Joi     = require('joi');

module.exports = (dbGet, dbRun, dbAll, checkAuth) => {
  const router = express.Router();

  /* ─── GET /api/trade/list ─────────────────────────────────────────── */
  router.get('/list', checkAuth, async (req, res) => {
    try {
      const rows = await dbAll(
        'SELECT * FROM trades WHERE user_id = ?',
        [req.session.userId]
      );
      res.json(rows);
    } catch (err) {
      console.error('Trade list error:', err);
      res.status(500).json({ error: 'db_error' });
    }
  });

  router.post('/buy', checkAuth, async (req, res) => {
    // On ne prend plus le buyPrice envoyé par le client
    const { assetCode, quantity } = req.body;
    const { error, value } = Joi.object({
      assetCode: Joi.string().pattern(/^(clickcoin|company-\d+)$/).required(),
      quantity:  Joi.number().positive().precision(8).max(1e10).required()
    }).validate({ assetCode, quantity });
    if (error) return res.status(400).json({ error: 'invalid_params' });
    const qty = +value.quantity;
  
    if (!assetCode || !qty)
      return res.status(400).json({ error: 'missing_params' });
  
    try {
      // Récupérer le dernier prix enregistré dans price_history
      let priceRow;
      if (assetCode === 'clickcoin') {
        priceRow = await dbGet(
          `SELECT close FROM price_history WHERE asset_type='clickcoin' ORDER BY recorded_at DESC LIMIT 1`
        );
      } else if (assetCode.startsWith('company-')) {
        const companyId = assetCode.split('-')[1];
        priceRow = await dbGet(
          `SELECT close FROM price_history WHERE asset_type='company' AND asset_id=? ORDER BY recorded_at DESC LIMIT 1`,
          [companyId]
        );
      }
      if (!priceRow) return res.status(500).json({ error: 'price_unavailable' });
      const marketPrice = +priceRow.close;
      const totalCost = qty * marketPrice;
    
      const user = await dbGet('SELECT balance FROM users WHERE id = ?', [req.session.userId]);
      if (!user) return res.status(500).json({ error: 'db_error' });
      if (user.balance < totalCost) return res.status(400).json({ error: 'insufficient_balance' });
    
      await dbRun('BEGIN TRANSACTION');
      await dbRun(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [totalCost, req.session.userId]
      );
      await dbRun(
        'INSERT INTO trades(user_id, asset_code, quantity, buy_price) VALUES (?,?,?,?)',
        [req.session.userId, assetCode, qty, marketPrice]
      );
      await dbRun('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await dbRun('ROLLBACK');
      console.error('Trade buy error:', err);
      res.status(500).json({ error: 'db_error' });
    }
  });  

  /* ─── POST /api/trade/sell ────────────────────────────────────────── */
router.post('/sell', checkAuth, async (req, res) => {
  // 1) On ne valide que assetCode, pas de sellPrice côté client
  const { error, value } = Joi.object({
    assetCode: Joi.string().pattern(/^(clickcoin|company-\d+)$/).required(),
  }).validate(req.body);
  if (error) return res.status(400).json({ error: 'invalid_params' });
  const { assetCode } = value;

  // 2) Récupérer le prix courant en base
  let row;
  if (assetCode === 'clickcoin') {
    row = await dbGet(
      `SELECT close AS price
         FROM price_history
        WHERE asset_type = 'clickcoin'
        ORDER BY recorded_at DESC
        LIMIT 1`
    );
  } else {
    const [, companyId] = assetCode.split('-');
    row = await dbGet(
      `SELECT close AS price
         FROM price_history
        WHERE asset_type = 'company'
          AND asset_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1`,
      [companyId]
    );
  }
  if (!row || !row.price || row.price <= 0) {
    return res.status(500).json({ error: 'price_unavailable' });
  }
  const price = Number(row.price);

  try {
    // 3) Lecture des trades de l’utilisateur
    const trades = await dbAll(
      'SELECT quantity, buy_price FROM trades WHERE user_id = ? AND asset_code = ?',
      [req.session.userId, assetCode]
    );
    if (trades.length === 0) {
      return res.status(400).json({ error: 'no_trades' });
    }

    // 4) Calculs basés sur price serveur
    const totalQty  = trades.reduce((sum, t) => sum + t.quantity, 0);
    const totalCost = trades.reduce((sum, t) => sum + t.quantity * t.buy_price, 0);
    const proceeds  = totalQty * price;
    const gain      = proceeds - totalCost;

    // 5) Transaction atomique
    await dbRun('BEGIN TRANSACTION');
    await dbRun(
      'DELETE FROM trades WHERE user_id = ? AND asset_code = ?',
      [req.session.userId, assetCode]
    );
    await dbRun(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [Math.round(proceeds), req.session.userId]
    );
    await dbRun('COMMIT');

    return res.json({ success: true, gain: Math.round(gain) });
  } catch (err) {
    await dbRun('ROLLBACK');
    console.error('Trade sell error:', err);
    return res.status(500).json({ error: 'db_error' });
  }
});

  return router;
};
