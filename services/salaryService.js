// services/salaryService.js
const { dbGet, dbRun, dbAll } = require('../db');

async function distributeSalaries() {
  // Démarre la transaction
  await dbRun('BEGIN TRANSACTION');
  try {
    const companies = await dbAll('SELECT id, salary_offered, capital FROM companies');
    for (const c of companies) {
      const { cnt } = await dbGet(
        'SELECT COUNT(*) AS cnt FROM users WHERE company_id = ?',
        [c.id]
      );
      const payroll = cnt * c.salary_offered;
      if (payroll > 0 && c.capital >= payroll) {
        await dbRun(
          'UPDATE companies SET capital = capital - ? WHERE id = ?',
          [payroll, c.id]
        );
        await dbRun(
          'UPDATE users SET balance = balance + ? WHERE company_id = ?',
          [c.salary_offered, c.id]
        );
      }
    }
    // Valide la transaction
    await dbRun('COMMIT');
  } catch (err) {
    // Annule la transaction en cas d'erreur
    await dbRun('ROLLBACK');
    console.error('distributeSalaries error:', err);
    throw err;
  }
}

module.exports = { distributeSalaries };
