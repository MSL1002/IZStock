const Database = require('better-sqlite3');
const config = require('./config');
const path = require('path');

const db = new Database(path.resolve(config.dbPath), {timeout: 3000});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;