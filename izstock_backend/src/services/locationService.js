const db = require('../db.js');
const { AppError } = require('../errors.js');
const itemModel = require('../models/itemModel');
const locationModel = require('../models/locationModel');
const mapModel = require('../models/mapModel');
const logModel = require('../models/logModel');

const bad = (field, message) =>
    new AppError(422, 'VALIDATION_FAILED', message, [{ field, message }]);

const assertKnownFields = (body, allowed) => {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new AppError(400, 'MALFORMED_REQUEST', 'Body must be a JSON object');
    }
    const unknown = Object.keys(body).filter((k) => !allowed.includes(k));
    if (unknown.length) throw new AppError(400, 'MALFORMED_REQUEST', 'Unknown field(s) in body', unknown);
};

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

const validPolygon = (p) =>
    Array.isArray(p) && p.length >= 3 &&
    p.every((pt) => Array.isArray(pt) && pt.length === 2 &&
        pt.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0));

const parseMoves = (body, max, entryFields) => {
    assertKnownFields(body, ['moves']);
    const moves = body.moves;
    if (!Array.isArray(moves) || moves.length < 1 || moves.length > max) {
        throw bad('moves', `moves must be an array of 1 to ${max} entries`);
    }
    moves.forEach((m, i) => assertKnownFields(m, entryFields));
    return moves;
};

const findShelf = (id) => 
    db.prepare('SELECT 1 FROM shelves WHERE id = ?').get(id);

exports.moveItem = (sku, body, role) => {
    console.log('move item running')
    assertKnownFields(body, ['shelfId']);
    if (!nonEmpty(body.shelfId)) throw bad('shelfId', 'shelfId is required');

    const item = itemModel.findBySku(sku);
    if (!item) throw new AppError(404, 'NOT_FOUND', 'Item not found');
    if (!findShelf(body.shelfId)) {
        throw new AppError(422, 'SHELF_NOT_FOUND', 'shelfId is not on the published map');
    }
    if (item.shelfId === body.shelfId) return item;

    db.transaction(() => {
        itemModel.setShelf(sku, body.shelfId);
        logModel.write({
            action: 'update', entityType: 'item', entityId: sku, performedBy: role,
            details: { fromShelfId: item.shelfId, toShelfId: body.shelfId },
        });
    })();
    return itemModel.findBySku(sku);
};

exports.moveShelves = (body, role) => {
    const moves = parseMoves(body, 100, ['shelfId', 'toAisleId', 'polygon']);

    const seen = new Set();
    for (const m of moves) {
        if (!nonEmpty(m.shelfId)) throw bad('shelfId', 'Each move needs a shelfId');
        if (!nonEmpty(m.toAisleId)) throw bad('toAisleId', 'Each move needs a toAisleId');
        if (m.polygon !== undefined && !validPolygon(m.polygon)) {
            throw bad('polygon', 'polygon must be 3 or more [x, y] points with x, y >= 0');
        }
        if (seen.has(m.shelfId)) throw bad('shelfId', `Shelf listed twice: ${m.shelfId}`);
        seen.add(m.shelfId);
    }

    let version;
    db.transaction(() => {
        const store = mapModel.getStore();
        if (!store) throw new AppError(404, 'NOT_FOUND', 'Store not found');

        const missingShelves = moves.filter((m) => !locationModel.findShelf(m.shelfId));
        if (missingShelves.length) {
            throw new AppError(422, 'SHELF_NOT_FOUND', 'One or more shelves do not exist',
                missingShelves.map((m) => ({ field: 'shelfId', message: `Shelf not found: ${m.shelfId}` })));
        }
        const missingAisles = moves.filter((m) => !locationModel.aisleExists(m.toAisleId));
        if (missingAisles.length) {
            throw new AppError(404, 'NOT_FOUND', 'One or more target aisles do not exist',
                missingAisles.map((m) => ({ field: 'toAisleId', message: `Aisle not found: ${m.toAisleId}` })));
        }

        const fromAisles = Object.fromEntries(
            moves.map((m) => [m.shelfId, locationModel.findShelf(m.shelfId).aisle_id]));

        moves.forEach((m) => locationModel.moveShelf(m.shelfId, m.toAisleId, m.polygon));

        version = mapModel.bumpVersion(store.store_id);
        logModel.write({
            action: 'update', entityType: 'map', entityId: `${store.store_id}@v${version}`,
            performedBy: role,
            details: { version, moves: moves.map((m) => ({
                shelfId: m.shelfId, fromAisleId: fromAisles[m.shelfId], toAisleId: m.toAisleId })) },
        });
    })();

    return { moved: moves.length, version };
};

exports.moveAisles = (body, role) => {
    const moves = parseMoves(body, 100, ['aisleId', 'aisleNumber']);

    const seen = new Set();
    for (const m of moves) {
        if (!nonEmpty(m.aisleId)) throw bad('aisleId', 'Each move needs an aisleId');
        if (!nonEmpty(m.aisleNumber)) throw bad('aisleNumber', 'Each move needs an aisleNumber');
        if (seen.has(m.aisleId)) throw bad('aisleId', `Aisle listed twice: ${m.aisleId}`);
        seen.add(m.aisleId);
    }

    let version;
    db.transaction(() => {
        const store = mapModel.getStore();
        if (!store) throw new AppError(404, 'NOT_FOUND', 'Store not found');

        // Final state: current numbers with every move applied at once, so swaps pass
        const numbers = new Map(locationModel.allAisleNumbers().map((a) => [a.id, a.aisle_number]));
        const before = {};
        for (const m of moves) {
            if (!numbers.has(m.aisleId)) {
                throw new AppError(404, 'NOT_FOUND', 'Aisle not found',
                    [{ field: 'aisleId', message: `Aisle not found: ${m.aisleId}` }]);
            }
            before[m.aisleId] = numbers.get(m.aisleId);
        }
        moves.forEach((m) => numbers.set(m.aisleId, m.aisleNumber.trim()));

        const count = new Map();
        for (const n of numbers.values()) count.set(n, (count.get(n) ?? 0) + 1);
        const dupes = [...count].filter(([, c]) => c > 1).map(([n]) => n);
        if (dupes.length) {
            throw new AppError(422, 'DUPLICATE_AISLE_NUMBER', 'Final state would have two aisles with the same number',
                dupes.map((n) => ({ field: 'aisleNumber', message: `Duplicate aisle number: ${n}` })));
        }

        moves.forEach((m) => locationModel.setAisleNumber(m.aisleId, m.aisleNumber.trim()));

        version = mapModel.bumpVersion(store.store_id);
        logModel.write({
            action: 'update', entityType: 'map', entityId: `${store.store_id}@v${version}`,
            performedBy: role,
            details: { version, moves: moves.map((m) => ({
                aisleId: m.aisleId, from: before[m.aisleId], to: m.aisleNumber.trim() })) },
        });
    })();

    return { updated: moves.length, version };
};