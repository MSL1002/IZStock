const db = require('../db');

const toMap = (row) => row && ({
    id: row.id,
    store_id: row.store_id,
    version: row.version,
    payload: row.payload ? JSON.parse(row.payload) : null,
});

exports.getMap = () =>
    toMap(db.prepare('SELECT * FROM map_versions ORDER BY version DESC LIMIT 1').get());

exports.getVersion = () =>
    db.prepare('SELECT version FROM map_versions ORDER BY version DESC LIMIT 1').get().version;