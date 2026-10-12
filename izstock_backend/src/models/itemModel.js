const db = require('../db.js');

const toItem = (row) => row && ({
    sku: row.sku,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    shelfId: row.shelf_id,
    aisleNumber: row.aisle_number,
    imageUrl: row.image_url ?? null,
});

const baseSelect = `
SELECT i.*, a.aisle_number
FROM items i
JOIN shelves s ON s.id = i.shelf_id
JOIN aisles a ON a.id = s.aisle_id`;

exports.findBySku = (sku) =>
    toItem(db.prepare(`${baseSelect} WHERE i.sku = ?`).get(sku));

exports.searchByName = (q, limit = 20) =>
    db.prepare(`${baseSelect} WHERE i.name LIKE ? LIMIT ?`)
    .all(`%${q}%`, limit).map(toItem);

exports.suggestByName = (q, limit = 5) =>
    db.prepare(`${baseSelect} WHERE i.name LIKE @prefix OR i.name LIKE @contains ORDER BY
      CASE
        WHEN name LIKE @prefix THEN 0
        WHEN sku  LIKE @prefix THEN 1
        ELSE 2
      END,
      name
    LIMIT @limit`)
    .all({
    prefix: `${q}%`,
    contains: `%${q}%`,
    limit
  }).map(toItem);

exports.create = ({ sku, name, price, quantity, shelfId, imageUrl }) =>
    db.prepare(`INSERT INTO items (sku, name, price, quantity, shelf_id, image_url)
        VALUES (?, ?, ?, ?, ?, ?)`)
    .run(sku, name, price, quantity, shelfId, imageUrl ?? null);

exports.deleteMany = db.transaction((skus) => {
    const del = db.prepare('DELETE FROM items WHERE sku = ?');
    skus.forEach((s) => del.run(s));
});