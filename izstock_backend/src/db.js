const Database = require('better-sqlite3');
const fs = require('fs');
const config = require('./config');
const path = require('path');

const isMemory = config.dbPath === ':memory:';

if(!isMemory) fs.mkdirSync(path.dirname(config.dbPath), {recursive: true})

const db = new Database(config.dbPath, {timeout: 3000});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

module.exports = db;