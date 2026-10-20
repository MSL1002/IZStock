const db = require('../db.js');

const toUser = (row) => row && ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    verified: row.verified
});

exports.findByEmail = (email) =>
  toUser(db.prepare('SELECT * FROM users WHERE email = ?').get(email));

exports.create = ({ email, firstName, lastName }) => {
  const info = db.prepare(
    'INSERT INTO users (email, first_name, last_name) VALUES (?, ?, ?)'
  ).run(email, firstName, lastName);
  return info.lastInsertRowid;
};

exports.updateName = (id, firstName, lastName) =>
  db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?').run(firstName, lastName, id);

exports.markVerified = (id) =>
  db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(id);