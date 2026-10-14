const db = require('../db.js');

const toUser = (row) => row && ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone_number: row.phone_number,
    verified: row.verified
});

exports.findByPhoneNumber = (phoneNumber) =>
  toUser(db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber));

exports.create = ({ phone, firstName, lastName }) => {
  const info = db.prepare(
    'INSERT INTO users (phone_number, first_name, last_name) VALUES (?, ?, ?)'
  ).run(phone, firstName, lastName);
  return info.lastInsertRowid;
};

exports.updateName = (id, firstName, lastName) =>
  db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?').run(firstName, lastName, id);

exports.markVerified = (id) =>
  db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(id);