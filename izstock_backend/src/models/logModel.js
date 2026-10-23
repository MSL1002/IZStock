const db = require('../db.js');

const toLog = (row) => row && ({
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  performedBy: row.performed_by,
  performedAt: row.performed_at.replace(' ', 'T') + 'Z',
  details: JSON.parse(row.details)
})

exports.write = ({ action, entityType, entityId, performedBy, details }) =>
  db.prepare(`INSERT INTO crud_log (action, entity_type, entity_id, performed_by, details)
              VALUES (?, ?, ?, ?, ?)`)
  .run(action, entityType, entityId, performedBy, details ? JSON.stringify(details) : null);

exports.list = ({ action, sku, from, to, pageSize, offset }) => {
    const where = [];
    const params = [];

    if (action) { where.push('action = ?'); params.push(action); }
    if (sku) {
        where.push(`(entity_id = ? OR EXISTS (
            SELECT 1 FROM json_each(crud_log.details, '$.skus') WHERE value = ?))`);
        params.push(sku, sku);
    }
    if (from) { where.push('performed_at >= datetime(?)'); params.push(from); }
    if (to)   { where.push('performed_at <= datetime(?)'); params.push(to); }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) AS n FROM crud_log ${clause}`).get(...params).n;
    const rows = db.prepare(
        `SELECT * FROM crud_log ${clause}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset);

    return { items: rows.map(toLog), total };
};