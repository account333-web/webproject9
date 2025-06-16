// services/taxService.js
const { dbGet, dbRun, dbAll } = require('../db');

async function applyTaxes() {
  await dbRun('BEGIN TRANSACTION');
  try {
    const rows = await dbAll(`
      SELECT u.id, u.balance, c.tax_rate, c.id AS countryId
        FROM users u
        JOIN countries c ON u.country = c.name
    `);
    for (const { id, balance, tax_rate, countryId } of rows) {
      const tax = Math.floor(balance * tax_rate);
      if (tax > 0) {
        await dbRun(
          'UPDATE users SET balance = balance - ? WHERE id = ?',
          [tax, id]
        );
        await dbRun(
          'UPDATE countries SET revenue = revenue + ? WHERE id = ?',
          [tax, countryId]
        );
      }
    }
    await dbRun('COMMIT');
  } catch (err) {
    await dbRun('ROLLBACK');
    console.error('applyTaxes error:', err);
    throw err;
  }
}

module.exports = { applyTaxes };
