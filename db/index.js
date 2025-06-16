// db/index.js
const sqlite3 = require('sqlite3').verbose();
const util    = require('util');
const { DB_FILE } = require('../config');

const db = new sqlite3.Database(DB_FILE, err => {
  if (err) console.error('DB connexion:', err);
  else console.log('Connecté à', DB_FILE);
});

module.exports = {
  dbRun: util.promisify(db.run.bind(db)),
  dbGet: util.promisify(db.get.bind(db)),
  dbAll: util.promisify(db.all.bind(db)),
  rawDb: db,
};
