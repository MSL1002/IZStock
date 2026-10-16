const db = require('../db.js');

const groupBy = (rows, key) => {
    const m = new Map();
    for (const r of rows) {
        if (!m.has(r[key])) m.set(r[key], []);
        m.get(r[key]).push(r);
    }
    return m;
};

const toMap = (row) => row && ({
    id: row.id,
    store_id: row.store_id,
    version: row.version,
    payload: row.payload ? JSON.parse(row.payload) : null,
});

exports.getStore = () =>
    db.prepare('SELECT store_id, current_version FROM stores LIMIT 1').get();

exports.getMap = () =>
    toMap(db.prepare('SELECT * FROM map_versions ORDER BY version DESC LIMIT 1').get());

exports.getVersion = () =>
    db.prepare('SELECT version FROM map_versions ORDER BY version DESC LIMIT 1').get().version;

exports.getUnits = (storeId, version) => {
    const row = db.prepare('SELECT payload FROM map_versions WHERE store_id = ? AND version = ?')
        .get(storeId, version);
    return (row && JSON.parse(row.payload).units) || 'meters';
};

exports.loadSections = (storeId, { includeSkus = false } = {}) => {
    const sections = db.prepare(
        'SELECT id, name, polygon, color FROM sections WHERE store_id = ? ORDER BY rowid'
    ).all(storeId);

    const aisles = db.prepare(`
        SELECT a.id, a.section_id, a.aisle_number, a.polygon
        FROM aisles a JOIN sections s ON s.id = a.section_id
        WHERE s.store_id = ? ORDER BY a.rowid`).all(storeId);

    const shelves = db.prepare(`
        SELECT sh.id, sh.aisle_id, sh.polygon, sh.side
        FROM shelves sh
        JOIN aisles a ON a.id = sh.aisle_id
        JOIN sections s ON s.id = a.section_id
        WHERE s.store_id = ? ORDER BY sh.rowid`).all(storeId);

    const skusByShelf = new Map();
    if (includeSkus) {
        for (const r of db.prepare('SELECT sku, shelf_id FROM items ORDER BY sku').all()) {
            if (!skusByShelf.has(r.shelf_id)) skusByShelf.set(r.shelf_id, []);
            skusByShelf.get(r.shelf_id).push(r.sku);
        }
    }

    const shelvesByAisle = groupBy(shelves, 'aisle_id');
    const aislesBySection = groupBy(aisles, 'section_id');

    const toShelf = (r) => ({
        id: r.id,
        polygon: JSON.parse(r.polygon),
        ...(r.side && { side: r.side }),
        ...(includeSkus && { itemSkus: skusByShelf.get(r.id) ?? [] }),
    });
    const toAisle = (r) => ({
        id: r.id,
        aisleNumber: r.aisle_number,
        polygon: JSON.parse(r.polygon),
        shelves: (shelvesByAisle.get(r.id) ?? []).map(toShelf),
    });

    return sections.map((r) => ({
        id: r.id,
        name: r.name,
        polygon: JSON.parse(r.polygon),
        ...(r.color && { color: r.color }),
        aisles: (aislesBySection.get(r.id) ?? []).map(toAisle),
    }));
};

exports.itemsBySku = () => {
    const out = {};
    const rows = db.prepare(`
        SELECT i.*, a.aisle_number, a.section_id
        FROM items i
        JOIN shelves sh ON sh.id = i.shelf_id
        JOIN aisles a ON a.id = sh.aisle_id`).all();
    for (const r of rows) {
        out[r.sku] = {
            name: r.name,
            price: r.price,
            quantity: r.quantity,
            shelfId: r.shelf_id,
            aisleNumber: r.aisle_number,
            sectionId: r.section_id,
            imageUrl: r.image_url ?? null,
        };
    }
    return out;
};

exports.itemShelves = () =>
    db.prepare('SELECT sku, shelf_id FROM items').all();

exports.apply = ({ storeId, version, payload, skuToShelf }) => {
    const upSection = db.prepare(`
        INSERT INTO sections (id, store_id, map_version, name, polygon, color)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET store_id = excluded.store_id,
            map_version = excluded.map_version, name = excluded.name,
            polygon = excluded.polygon, color = excluded.color`);
    const upAisle = db.prepare(`
        INSERT INTO aisles (id, section_id, aisle_number, polygon)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET section_id = excluded.section_id,
            aisle_number = excluded.aisle_number, polygon = excluded.polygon`);
    const upShelf = db.prepare(`
        INSERT INTO shelves (id, aisle_id, polygon, side)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET aisle_id = excluded.aisle_id,
            polygon = excluded.polygon, side = excluded.side`);

    const keep = { sections: new Set(), aisles: new Set(), shelves: new Set() };

    // Parents first so foreign keys resolve
    for (const s of payload.sections) {
        upSection.run(s.id, storeId, version, s.name, JSON.stringify(s.polygon), s.color ?? null);
        keep.sections.add(s.id);
        for (const a of s.aisles) {
            upAisle.run(a.id, s.id, a.aisleNumber.trim(), JSON.stringify(a.polygon));
            keep.aisles.add(a.id);
            for (const sh of a.shelves) {
                upShelf.run(sh.id, a.id, JSON.stringify(sh.polygon), sh.side ?? null);
                keep.shelves.add(sh.id);
            }
        }
    }

    // Move items onto their new shelves before any shelf is deleted
    const move = db.prepare('UPDATE items SET shelf_id = ? WHERE sku = ?');
    for (const [sku, shelfId] of skuToShelf) move.run(shelfId, sku);

    // Children first when deleting (table names are constants, not user input)
    for (const table of ['shelves', 'aisles', 'sections']) {
        const del = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
        for (const { id } of db.prepare(`SELECT id FROM ${table}`).all()) {
            if (!keep[table].has(id)) del.run(id);
        }
    }

    db.prepare('INSERT INTO map_versions (id, store_id, version, payload) VALUES (?, ?, ?, ?)')
        .run(crypto.randomUUID(), storeId, version, JSON.stringify(payload));
    db.prepare('UPDATE stores SET current_version = ? WHERE store_id = ?')
        .run(version, storeId);
};

exports.bumpVersion = (storeId) => {
    const store = db.prepare('SELECT current_version FROM stores WHERE store_id = ?').get(storeId);
    const version = store.current_version + 1;

    const payload = {
        storeId,
        editedBy: 'manager',
        editedAt: new Date().toISOString(),
        status: 'published',
        baseVersion: store.current_version,
        units: exports.getUnits(storeId, store.current_version),
        sections: exports.loadSections(storeId, { includeSkus: true }),
    };

    console.log(payload);

    db.prepare('INSERT INTO map_versions (id, store_id, version, payload) VALUES (?, ?, ?, ?)')
        .run(crypto.randomUUID(), storeId, version, JSON.stringify(payload));
    db.prepare('UPDATE stores SET current_version = ? WHERE store_id = ?').run(version, storeId);
    console.log(version, storeId)
    return version;
};