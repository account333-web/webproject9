// config/index.js
const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_FILE: path.join(__dirname, '..', 'clicksociety.db'),
  TIME_SCALE: parseFloat(process.env.TIME_SCALE) || 1,
};
