//In memory SQLite DB for testing
const db = require('../../src/db');
const TABLES = ['list_items', 'lists', 'sessions', 'confirmation_codes',
                'users', 'crud_log', 'items', 'shelves', 'aisles',
                'sections', 'map_versions', 'stores'];

function resetDb() {
    for (const t of TABLES) db.prepare(`DELETE FROM ${t}`).run();
}

function seedStore() {
    console.log('store seeded')
    db.prepare(`INSERT INTO stores (store_id, name, current_version, manager_code_hash)
                VALUES (?, ?, ?, ?)`).run('store1', 'Test Store', 1, 'hash-of-TESTCODE');
    db.prepare(`INSERT INTO sections (id, store_id, map_version, name, polygon)
                VALUES ('sec1', 'store1', 1, 'Dairy', '[[0,0],[10,0],[10,10]]')`).run();
    db.prepare(`INSERT INTO aisles (id, section_id, aisle_number, polygon)
                VALUES ('a1', 'sec1', '1', '[[0,0],[5,0],[5,5]]')`).run();
    db.prepare(`INSERT INTO shelves (id, aisle_id, polygon)
                VALUES ('s1', 'a1', '[[0,0],[1,0],[1,1]]')`).run();
    db.prepare(`INSERT INTO items (sku, name, price, quantity, shelf_id, image_url)
                VALUES ('200002', '2% Milk 1 gal', 3.79,  52, 's1', null)`).run();
    const uId = db.prepare(`INSERT INTO users (email, first_name, last_name, verified)
                VALUES ('JDoe@email.org', 'John', 'Doe', 1)`).run().lastInsertRowid;
    const lId = db.prepare(`INSERT INTO lists (user_id)
                VALUES (?)`).run(uId).lastInsertRowid;
    // console.log(db.pragma('foreign_key_list(list_items)'));
    // console.log(db.prepare('SELECT typeof(sku) AS t, sku FROM items').all());
    // console.log(db.prepare('SELECT * FROM lists').all(), 'lId =', lId);
    db.prepare(`INSERT INTO list_items (list_id, sku, quantity)
            VALUES (?, ?, ?)`).run(lId, '200002', 1)


}

module.exports = { db, resetDb, seedStore };