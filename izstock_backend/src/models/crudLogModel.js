const db = require('../db.js');

exports.write = ({ action, entityType, entityId, performedBy, details }) =>
  db.prepare(`INSERT INTO crud_log (action, entity_type, entity_id, performed_by, details)
              VALUES (?, ?, ?, ?, ?)`)
  .run(action, entityType, entityId, performedBy, details ? JSON.stringify(details) : null);