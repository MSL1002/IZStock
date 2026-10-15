require('dotenv').config();
const crypto = require('crypto');
const db = require('../src/db.js');

const code = process.argv[2];
if (!code || code.length !== 8) throw new Error('Pass an 8 character code');

const hash = crypto.createHmac('sha256', process.env.CODE_PEPPER).update(code).digest('hex');

db.prepare(`INSERT INTO stores (store_id, name, manager_code_hash)
            VALUES ('store-1', 'Demo Store', ?)
            ON CONFLICT(store_id) DO UPDATE SET manager_code_hash = excluded.manager_code_hash`)
  .run(hash);

console.log('Manager code set.');