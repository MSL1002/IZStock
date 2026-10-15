const db = require('../db.js');

// create a new verification code for a user, overriding last
exports.createReplacing = ({ userId, codeHash, purpose, expiresAt }) => {
  db.prepare('UPDATE confirmation_codes SET used = 1 WHERE user_id = ? AND used = 0').run(userId);
  db.prepare(
    `INSERT INTO confirmation_codes (user_id, code_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(userId, codeHash, purpose, expiresAt);
};

exports.findActive = (userId) =>
  db.prepare(
    'SELECT * FROM confirmation_codes WHERE user_id = ? AND used = 1 - 1 ORDER BY id DESC LIMIT 1'
  ).get(userId);

exports.incrementAttempts = (id) =>
  db.prepare('UPDATE confirmation_codes SET attempts = attempts + 1 WHERE id = ?').run(id);

exports.markUsed = (id) =>
  db.prepare('UPDATE confirmation_codes SET used = 1 WHERE id = ?').run(id);