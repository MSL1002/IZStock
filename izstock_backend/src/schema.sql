CREATE TABLE IF NOT EXISTS stores (
    store_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 0,
    manager_code_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS map_versions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(store_id),
    version INTEGER NOT NULL,
    payload TEXT NOT NULL CHECK (json_valid(payload)),
    UNIQUE(store_id, version)
);

CREATE INDEX idx_map_versions_store
    ON map_versions (store_id, version DESC);

CREATE TABLE IF NOT EXISTS sections (
    id          TEXT PRIMARY KEY,
    store_id    TEXT NOT NULL REFERENCES stores(store_id),
    map_version INTEGER NOT NULL,
    name        TEXT NOT NULL,
    polygon     TEXT NOT NULL CHECK (json_valid(polygon)),
    color       TEXT
);

CREATE TABLE IF NOT EXISTS aisles (
    id           TEXT PRIMARY KEY,
    section_id   TEXT NOT NULL REFERENCES sections(id),
    aisle_number TEXT NOT NULL,
    polygon      TEXT NOT NULL CHECK (json_valid(polygon))
);

CREATE INDEX idx_aisles_number ON aisles (aisle_number);

CREATE TABLE IF NOT EXISTS shelves (
    id        TEXT PRIMARY KEY,
    aisle_id  TEXT NOT NULL REFERENCES aisles(id),
    polygon   TEXT NOT NULL CHECK (json_valid(polygon)),
    side      TEXT CHECK (side IN ('left', 'right', 'front', 'back'))
);

CREATE TABLE IF NOT EXISTS items (
    sku         TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL NOT NULL CHECK (price >= 0),
    quantity    INTEGER NOT NULL CHECK (quantity >= 0),
    shelf_id    TEXT NOT NULL REFERENCES shelves(id),
    image_url   TEXT
);

CREATE INDEX idx_items_name ON items (name);
CREATE INDEX idx_items_shelf ON items (shelf_id);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number  TEXT NOT NULL UNIQUE,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
);

CREATE TABLE IF NOT EXISTS confirmation_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    code        TEXT NOT NULL,
    purpose     TEXT NOT NULL CHECK (purpose IN ('registration', 'sign_in')),
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1))
);

CREATE TABLE IF NOT EXISTS lists (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS list_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id     INTEGER NOT NULL REFERENCES lists(id),
    sku         TEXT NOT NULL REFERENCES items(sku),
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    UNIQUE (list_id, sku)
);

CREATE TABLE IF NOT EXISTS crud_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    action        TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'batch_delete')),
    entity_type   TEXT NOT NULL CHECK (entity_type IN ('item', 'map')),
    entity_id     TEXT NOT NULL,
    performed_by  TEXT NOT NULL,
    performed_at  TEXT NOT NULL DEFAULT (datetime('now')),
    details       TEXT CHECK (details IS NULL OR json_valid(details))
);

CREATE INDEX idx_crud_log_entity ON crud_log (entity_type, entity_id);