// src/seed.js
const crypto = require('crypto');
const db = require('./db');

const STORE_ID = 'store-1';
const VERSION = 1;
const MANAGER_CODE = 'MANAGER1';   // demo code, 8 chars per your API contract

// salt:hash using Node's built-in scrypt (no extra dependency).
// authService must verify codes using this same format.
const hashCode = (code) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(code, salt, 64).toString('hex')}`;
};

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// ---- Layout: 6 aisles side by side ----
const sectionDefs = [
    { id: 'sec-produce', name: 'Produce', color: '#4CAF50', aisles: [1, 2] },
    { id: 'sec-dairy',   name: 'Dairy',   color: '#2196F3', aisles: [3] },
    { id: 'sec-frozen',  name: 'Frozen',  color: '#00BCD4', aisles: [4] },
    { id: 'sec-pantry',  name: 'Pantry',  color: '#FF9800', aisles: [5, 6] },
];
const AISLE_W = 3, AISLE_H = 20, AISLE_Y = 5, GAP = 3;
const aisleX = (n) => 4 + (n - 1) * (AISLE_W + GAP);
const shelfId = (n, side) => `a${n}-${side}`;

// ---- Items: [sku, name, price, quantity, shelfId, imageUrl] ----
const items = [
    ['100001', 'Bananas (per lb)',         0.59, 120, 'a1-L', null],
    ['100002', 'Gala Apples (per lb)',     1.49,  85, 'a1-L', null],
    ['100003', 'Navel Oranges (per lb)',   1.29,  60, 'a1-L', null],
    ['100004', 'Baby Carrots 1 lb',        1.99,  40, 'a1-R', null],
    ['100005', 'Romaine Lettuce',          2.49,  30, 'a1-R', null],
    ['100006', 'Roma Tomatoes (per lb)',   1.79,  50, 'a1-R', null],
    ['100007', 'Russet Potatoes 5 lb',     3.99,  35, 'a2-L', null],
    ['100008', 'Yellow Onions 3 lb',       2.99,  45, 'a2-L', null],
    ['100009', 'Avocado',                  1.25,   0, 'a2-R', null],  // out of stock
    ['100010', 'Lemons (each)',            0.69,  70, 'a2-R', null],
    ['200001', 'Whole Milk 1 gal',         3.89,  48, 'a3-L', null],
    ['200002', '2% Milk 1 gal',            3.79,  52, 'a3-L', null],
    ['200003', 'Almond Milk 64 oz',        3.49,  26, 'a3-L', null],
    ['200004', 'Large Eggs 12 ct',         4.29,  60, 'a3-R', null],
    ['200005', 'Salted Butter 1 lb',       4.99,  33, 'a3-R', null],
    ['200006', 'Sharp Cheddar 8 oz',       3.19,  41, 'a3-R', null],
    ['300001', 'Frozen Pepperoni Pizza',   5.99,  22, 'a4-L', null],
    ['300002', 'Vanilla Ice Cream 1.5 qt', 4.49,  18, 'a4-L', null],
    ['300003', 'Frozen Peas 12 oz',        1.79,  44, 'a4-R', null],
    ['300004', 'Frozen Waffles 10 ct',     3.29,   0, 'a4-R', null],  // out of stock
    ['400001', 'Spaghetti 16 oz',          1.59,  80, 'a5-L', null],
    ['400002', 'Marinara Sauce 24 oz',     2.79,  55, 'a5-L', null],
    ['400003', 'Long Grain Rice 5 lb',     4.99,  30, 'a5-R', null],
    ['400004', 'Creamy Peanut Butter',     3.49,  38, 'a5-R', 'https://example.com/images/peanut-butter.jpg'],
    ['400005', 'Corn Flakes Cereal',       3.99,  42, 'a6-L', null],
    ['400006', 'Rolled Oats 42 oz',        4.29,  28, 'a6-L', null],
    ['400007', 'Ground Coffee 12 oz',      8.99,  19, 'a6-R', null],
    ['400008', 'Black Tea 20 bags',        3.19,  36, 'a6-R', null],
];

// ---- Build the nested map (used for both the rows and the payload) ----
const skusByShelf = {};
for (const [sku, , , , shelf] of items) (skusByShelf[shelf] ||= []).push(sku);

const sections = sectionDefs.map((sec) => {
const minX = aisleX(Math.min(...sec.aisles)) - 1;
const maxX = aisleX(Math.max(...sec.aisles)) + AISLE_W + 1;
return {
    id: sec.id,
    name: sec.name,
    color: sec.color,
    polygon: rect(minX, AISLE_Y - 1, maxX - minX, AISLE_H + 2),
    aisles: sec.aisles.map((n) => {
    const x = aisleX(n);
    const half = AISLE_W / 2;
    return {
        id: `aisle-${n}`,
        aisleNumber: String(n),
        polygon: rect(x, AISLE_Y, AISLE_W, AISLE_H),
        shelves: [
        { id: shelfId(n, 'L'), side: 'left',
            polygon: rect(x, AISLE_Y, half, AISLE_H),
            itemSkus: skusByShelf[shelfId(n, 'L')] || [] },
        { id: shelfId(n, 'R'), side: 'right',
            polygon: rect(x + half, AISLE_Y, half, AISLE_H),
            itemSkus: skusByShelf[shelfId(n, 'R')] || [] },
        ],
    };
    }),
};
});

const payload = {
storeId: STORE_ID,
editedBy: 'seed',
editedAt: new Date().toISOString(),
status: 'published',
baseVersion: VERSION - 1,
units: 'meters',
sections,
};

const seed = db.transaction(() => {
// Child-first so foreign keys never complain
db.exec(`
    DELETE FROM list_items;
    DELETE FROM lists;
    DELETE FROM confirmation_codes;
    DELETE FROM users;
    DELETE FROM crud_log;
    DELETE FROM items;
    DELETE FROM shelves;
    DELETE FROM aisles;
    DELETE FROM sections;
    DELETE FROM map_versions;
    DELETE FROM stores;
`);

// Store first: everything else references it
db.prepare(`INSERT INTO stores (store_id, name, current_version, manager_code_hash)
            VALUES (?, ?, ?, ?)`)
    .run(STORE_ID, 'IZStock Demo Market', VERSION, hashCode(MANAGER_CODE));

db.prepare(`INSERT INTO map_versions (id, store_id, version, payload)
            VALUES (?, ?, ?, ?)`)
    .run(`${STORE_ID}-v${VERSION}`, STORE_ID, VERSION, JSON.stringify(payload));

const insSection = db.prepare(
    `INSERT INTO sections (id, store_id, map_version, name, polygon, color)
    VALUES (?, ?, ?, ?, ?, ?)`);
const insAisle = db.prepare(
    'INSERT INTO aisles (id, section_id, aisle_number, polygon) VALUES (?, ?, ?, ?)');
const insShelf = db.prepare(
    'INSERT INTO shelves (id, aisle_id, polygon, side) VALUES (?, ?, ?, ?)');
const insItem = db.prepare(
    `INSERT INTO items (sku, name, price, quantity, shelf_id, image_url)
    VALUES (?, ?, ?, ?, ?, ?)`);

for (const sec of sections) {
    insSection.run(sec.id, STORE_ID, VERSION, sec.name, JSON.stringify(sec.polygon), sec.color);
    for (const aisle of sec.aisles) {
    insAisle.run(aisle.id, sec.id, aisle.aisleNumber, JSON.stringify(aisle.polygon));
    for (const shelf of aisle.shelves) {
        insShelf.run(shelf.id, aisle.id, JSON.stringify(shelf.polygon), shelf.side);
    }
    }
}
for (const row of items) insItem.run(...row);

// Test user with a saved list (for testing list persistence, req 6)
const userId = db.prepare(
    'INSERT INTO users (email, first_name, last_name) VALUES (?, ?, ?)')
    .run('8mrl1002@gmail.com', 'Test', 'User').lastInsertRowid;
const listId = db.prepare('INSERT INTO lists (user_id) VALUES (?)')
    .run(userId).lastInsertRowid;
const insListItem = db.prepare(
    'INSERT INTO list_items (list_id, sku, quantity) VALUES (?, ?, ?)');
insListItem.run(listId, '200004', 1);   // eggs
insListItem.run(listId, '100001', 3);   // bananas
insListItem.run(listId, '400007', 1);   // coffee

// A few log entries so the week 9 log UI has something to show
const insLog = db.prepare(
    `INSERT INTO crud_log (action, entity_type, entity_id, performed_by, details)
    VALUES (?, ?, ?, ?, ?)`);
insLog.run('create', 'item', '100001', 'employee', JSON.stringify({ name: 'Bananas (per lb)' }));
insLog.run('update', 'item', '200001', 'employee', JSON.stringify({ quantity: { from: 40, to: 48 } }));
insLog.run('create', 'map', `${STORE_ID}-v${VERSION}`, 'seed', null);
});

seed();

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(
    `Seeded: ${count('stores')} store, ${count('sections')} sections, ${count('aisles')} aisles, ` +
    `${count('shelves')} shelves, ${count('items')} items, ${count('users')} user`);
console.log(`Demo manager code: ${MANAGER_CODE}`);
db.close();