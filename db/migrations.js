// db/migrations.js
const { dbRun, dbAll } = require('./index');

// Initialize tables and default data
async function initDb() {
    try {
      // --- Users table and migrations ---
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password_hash TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          balance INTEGER DEFAULT 0,
          country TEXT,
          company TEXT
        )
      `);
      const userCols = await dbAll("PRAGMA table_info(users)");
      if (!userCols.some(c => c.name === 'avatar_url')) {
        await dbRun('ALTER TABLE users ADD COLUMN avatar_url TEXT');
      }
      if (!userCols.some(c => c.name === 'snake_best_score')) {
        await dbRun('ALTER TABLE users ADD COLUMN snake_best_score INTEGER NOT NULL DEFAULT 0');
      }
      // … dans initDb(), après avoir ajouté snake_best_score
      if (!userCols.some(c => c.name === 'pong_best_score')) {
        await dbRun(
          'ALTER TABLE users ADD COLUMN pong_best_score INTEGER NOT NULL DEFAULT 0'
        );
      }
      // --- Countries table ---
      await dbRun(`
        CREATE TABLE IF NOT EXISTS countries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          tax_rate REAL,
          housing_cost INTEGER,
          entry_fee INTEGER,
          revenue INTEGER DEFAULT 0
        )
      `);

      // --- Companies table and migrations ---
      await dbRun(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          employees_count INTEGER DEFAULT 0,
          capital INTEGER DEFAULT 0,
          salary_offered INTEGER DEFAULT 0,
          shares_outstanding INTEGER DEFAULT 1000,
          owner_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const companyCols = await dbAll("PRAGMA table_info(companies)");
      if (!companyCols.some(c => c.name === 'owner_id')) {
        await dbRun('ALTER TABLE companies ADD COLUMN owner_id INTEGER');
      }
      if (!companyCols.some(c => c.name === 'employees_count')) {
        await dbRun('ALTER TABLE companies ADD COLUMN employees_count INTEGER DEFAULT 0');
      }

      // --- Trades table ---
      await dbRun(`
        CREATE TABLE IF NOT EXISTS trades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          asset_code TEXT,
          quantity REAL,
          buy_price REAL,
          buy_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // --- Price history table and migrations ---
      await dbRun(`
        CREATE TABLE IF NOT EXISTS price_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          asset_type TEXT,
          asset_id INTEGER,
          open REAL,
          high REAL,
          low REAL,
          close REAL,
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const priceCols = await dbAll("PRAGMA table_info(price_history)");
      const required = ['open', 'high', 'low', 'close'];
      for (const col of required) {
        if (!priceCols.some(c => c.name === col)) {
          await dbRun(`ALTER TABLE price_history ADD COLUMN ${col} REAL`);
        }
      }

      // --- Default countries data ---
      const defaultCountries = [
        ['GPT-City', 0.05, 100, 500],
        ['MilliGram', 0.03, 120, 400],
        ['NoTaxes', 0, 0, 0],
        ['NoMoney', 0.01, 80, 300]
      ];
      for (const c of defaultCountries) {
        await dbRun(
          `INSERT OR IGNORE INTO countries(name,tax_rate,housing_cost,entry_fee)
           VALUES(?,?,?,?)`,
          c
        );
      }

      // --- Snake game migrations ---
      await dbRun(`
        CREATE TABLE IF NOT EXISTS snake_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          used INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);
      // après CREATE TABLE IF NOT EXISTS snake_sessions ( ... )
      const sessionCols = await dbAll("PRAGMA table_info(snake_sessions)");
      if (!sessionCols.some(c => c.name === "apple_count")) {
        await dbRun("ALTER TABLE snake_sessions ADD COLUMN apple_count INTEGER NOT NULL DEFAULT 0");
      }
      if (!sessionCols.some(c => c.name === "last_eat")) {
        await dbRun("ALTER TABLE snake_sessions ADD COLUMN last_eat INTEGER");
      }
      // Vérifie et ajoute les champs pour cooldown et référence ID entreprise/pays
      if (!userCols.some(c => c.name === 'company_id')) {
        await dbRun('ALTER TABLE users ADD COLUMN company_id INTEGER');
      }
      if (!userCols.some(c => c.name === 'last_company_change')) {
        await dbRun('ALTER TABLE users ADD COLUMN last_company_change INTEGER');
      }
      if (!userCols.some(c => c.name === 'last_country_change')) {
        await dbRun('ALTER TABLE users ADD COLUMN last_country_change INTEGER');
      }

      // Ajout du champ created_at dans trades (pour empêcher les ventes immédiates)
      const tradeCols = await dbAll("PRAGMA table_info(trades)");
      if (!tradeCols.some(c => c.name === 'created_at')) {
        await dbRun("ALTER TABLE trades ADD COLUMN created_at INTEGER DEFAULT (strftime('%s','now') * 1000)");
      }

      // Table de sessions sécurisées pour Pong
      await dbRun(`
        CREATE TABLE IF NOT EXISTS pong_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          start_time INTEGER NOT NULL,
          used INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

    } catch (err) {
      console.error('DB initialization error:', err);
    }
}

module.exports = initDb;
