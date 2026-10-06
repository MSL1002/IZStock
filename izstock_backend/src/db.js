const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'izstock.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;