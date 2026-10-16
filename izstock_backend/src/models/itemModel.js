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

const fromJoin = `
FROM items i
JOIN shelves s ON s.id = i.shelf_id
JOIN aisles a ON a.id = s.aisle_id`;

exports.findBySku = (sku) =>
  toItem(db.prepare(`${baseSelect} WHERE i.sku = ?`).get(sku));

exports.searchByName = (q, limit) =>
  db.prepare(`${baseSelect} WHERE i.name LIKE ? LIMIT ?`)
  .all(`%${q}%`, limit).map(toItem);

exports.suggestByName = (q, limit) =>
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

exports.list = ({ name, aisle, pageSize, offset }) => {
  const where = [];
  const params = [];
  if (name)   { where.push('(i.name LIKE ? OR i.sku LIKE ?)'); params.push(`%${name}%`, `${name}%`); }
  if (aisle) { where.push('a.aisle_number = ?');              params.push(aisle); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS n ${fromJoin} ${clause}`).get(...params).n;

  const rows = db.prepare(
    `SELECT i.*, a.aisle_number ${fromJoin} ${clause}
     ORDER BY i.name, i.sku
     LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset);

  return { items: rows.map(toItem), total };
};

//EMPLOYEES ONLY

exports.create = ({ sku, name, price, quantity, shelfId, imageUrl }) =>
    db.prepare(`INSERT INTO items (sku, name, price, quantity, shelf_id, image_url)
        VALUES (?, ?, ?, ?, ?, ?)`)
    .run(sku, name, price, quantity, shelfId, imageUrl ?? null);

exports.deleteMany = db.transaction((skus) => {
  const delList = db.prepare('DELETE FROM list_items WHERE sku = ?');
  const del = db.prepare('DELETE FROM items WHERE sku = ?');
  skus.forEach((s) => { delList.run(s); del.run(s); });
});

exports.update = (sku, fields) => {
  const sets = [];
  const params = [];
  if (fields.name !== undefined)     { sets.push('name = ?');      params.push(fields.name); }
  if (fields.price !== undefined)    { sets.push('price = ?');     params.push(fields.price); }
  if (fields.quantity !== undefined) { sets.push('quantity = ?');  params.push(fields.quantity); }
  if (fields.imageUrl !== undefined) { sets.push('image_url = ?'); params.push(fields.imageUrl); }
  if (!sets.length) return 0;
  return db.prepare(`UPDATE items SET ${sets.join(', ')} WHERE sku = ?`).run(...params, sku).changes;
};

exports.remove = (sku) => {
  db.prepare('DELETE FROM list_items WHERE sku = ?').run(sku);   // or add ON DELETE CASCADE
  return db.prepare('DELETE FROM items WHERE sku = ?').run(sku).changes;
};

exports.shelfExists = (shelfId) =>
  !!db.prepare('SELECT 1 FROM shelves WHERE id = ?').get(shelfId);

exports.missingSkus = (skus) => {
  const exists = db.prepare('SELECT 1 FROM items WHERE sku = ?');
  return skus.filter((s) => !exists.get(s));
};

exports.setShelf = (sku, shelfId) =>
    db.prepare('UPDATE items SET shelf_id = ? WHERE sku = ?').run(shelfId, sku).changes;