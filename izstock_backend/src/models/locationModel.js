const db = require('../db.js');

exports.findShelf = (id) =>
    db.prepare('SELECT id, aisle_id FROM shelves WHERE id = ?').get(id);

exports.aisleExists = (id) =>
    !!db.prepare('SELECT 1 FROM aisles WHERE id = ?').get(id);

exports.moveShelf = (shelfId, aisleId, polygon) =>
    polygon
        ? db.prepare('UPDATE shelves SET aisle_id = ?, polygon = ? WHERE id = ?')
            .run(aisleId, JSON.stringify(polygon), shelfId)
        : db.prepare('UPDATE shelves SET aisle_id = ? WHERE id = ?')
            .run(aisleId, shelfId);

exports.allAisleNumbers = () =>
    db.prepare('SELECT id, aisle_number FROM aisles').all();

exports.setAisleNumber = (aisleId, number) =>
    db.prepare('UPDATE aisles SET aisle_number = ? WHERE id = ?').run(number, aisleId);