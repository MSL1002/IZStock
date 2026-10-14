const db = require('../db');

exports.create = ({ tokenHash, userId, expiresAt }) =>
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash, userId, expiresAt);

exports.findValid = (tokenHash) =>
  db.prepare(
    `SELECT s.token_hash, u.id, u.first_name, u.last_name, u.phone_number
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`
  ).get(tokenHash);

exports.delete = (tokenHash) =>
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);

exports.findUserByTokenHash = (tokenHash) => {
        const row = db.prepare(`
        SELECT user_id
        FROM sessions
        WHERE token_hash = ? AND expires_at > ?`)
    .get(tokenHash, new Date().toISOString());
    return row ? row.user_id : null;
}
