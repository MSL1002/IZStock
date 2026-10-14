const db = require('../db.js');

const toEntry = (row) => row && ({
    sku: row.sku,
    quantity: row.quantity
})

exports.getUserList = (userID) => ({
    items: db.prepare(`
        SELECT li.sku, li.quantity
        FROM list_items li
        JOIN lists l ON l.id = li.list_id
        WHERE l.user_id = ?
        ORDER BY li.id
        `)
    .all(userID).map(toEntry),
});

exports.replace = db.transaction((userID, entries) => {
    const exists = db.prepare('SELECT 1 ITEM FROM items WHERE sku = ?')
    const missing = entries.filter((e) => !exists.get(e.sku)).map((e) => e.sku);
    if(missing.length) return { missing };

    const row = db.prepare('SELECT id FROM lists WHERE user_id = ?').get(userID);
    const listID = row ? row.id : db.prepare('ISERT INTO lists (user_id) VALUES (?)').run(userID).lastInsertRowid;

    db.prepare('DELETE FROM list_items WHERE list_id = ?').run(listID);

    const insert = db.prepare('INSERT INTO list_items (list_id, sku, quantity) VALUES (?, ?, ?)');
    entries.forEach((e) => insert.run(listID, e.sku, e.quantity));

    return{ missing: [] };
});
