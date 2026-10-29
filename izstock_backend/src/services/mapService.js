const db = require('../db.js');
const {AppError} = require('../errors.js');
const { compile } = require('../lib/validator');
const mapSchema = require('../schemas/map.read.json');
const mapModel = require('../models/mapModel');
const itemModel = require('../models/itemModel');
const logModel = require('../models/logModel');

const validateMapShape = compile(mapSchema);

const bad = (field, message) =>
    new AppError(422, 'VALIDATION_FAILED', message, [{ field, message }]);

const requirePublished = () => {
    const store = mapModel.getMap();
    if (!store || store.current_version === 0) {
        throw new AppError(404, 'NOT_FOUND', 'No map has been published yet');
    }
    return store;
};


exports.getVersion = () => ({ version: mapModel.getMap().current_version });

// reads

exports.getPublic = () => {
    const store = mapModel.getMap();
    return {
        storeId: store.store_id,
        version: store.current_version,
        units: mapModel.getUnits(store.store_id, store.current_version),
        sections: mapModel.loadSections(store.store_id),
        items: mapModel.itemsBySku(),
    };
};

exports.getEditor = () => {
    const store = requirePublished();
    const shelfItemCounts = mapModel.shelfItemCount();
    console.log(shelfItemCounts);
    console.log(store);
    return {
        storeId: store.store_id,
        status: 'published',
        version: store.version,
        units: mapModel.getUnits(store.store_id, store.version),
        sections: mapModel.loadSections(store.store_id, { includeSkus: true }),
        shelfItemCounts,
    };
};

const checkStructure = (body) => {
    const seen = { section: new Set(), aisle: new Set(), shelf: new Set() };
    const aisleNumbers = new Set();
    const duplicateNumbers = new Set();
    const skuToShelf = new Map();

    const unique = (kind, id) => {
        if (seen[kind].has(id)) throw bad(`${kind}.id`, `Duplicate ${kind} id: ${id}`);
        seen[kind].add(id);
    };

    for (const s of body.sections) {
        unique('section', s.id);
        for (const a of s.aisles) {
            unique('aisle', a.id);
            const num = a.aisleNumber.trim();
            if (aisleNumbers.has(num)) duplicateNumbers.add(num);
            aisleNumbers.add(num);

            for (const sh of a.shelves) {
                unique('shelf', sh.id);
                if(sh.itemSkus){
                    for (const sku of sh.itemSkus) {
                        if (skuToShelf.has(sku)) throw bad('itemSkus', `SKU ${sku} is on more than one shelf`);
                        skuToShelf.set(sku, sh.id);
                    }
                }
            }
        }
    }

    if (duplicateNumbers.size) {
        throw new AppError(422, 'DUPLICATE_AISLE_NUMBER', 'Two aisles share the same number',
            [...duplicateNumbers].map((n) => ({ field: 'aisleNumber', message: `Duplicate aisle number: ${n}` })));
    }
    return { shelfIds: seen.shelf, skuToShelf };
};

// writes

exports.save = (body, role) => {
    validateMapShape(body);
    if (body.status !== 'published') {
        throw bad('status', 'Only status "published" is supported');
    }
    const { shelfIds, skuToShelf } = checkStructure(body);

    db.transaction(() => {
        const store = mapModel.getStore();
        if (!store) throw new AppError(404, 'NOT_FOUND', 'Store not found');
        if (body.storeId !== store.store_id) throw bad('storeId', 'storeId does not match this store');
        
        if(body.baseVersion){
            if (body.baseVersion !== store.version) {
                throw new AppError(409, 'STALE_VERSION', 'The map changed since you loaded it',
                    [{ field: 'baseVersion', message: `Server is at version ${store.version}` }]);
            }
        }

        const missing = itemModel.missingSkus([...skuToShelf.keys()]);
        if (missing.length) {
            throw new AppError(422, 'SKUS_NOT_FOUND', 'One or more SKUs do not exist',
                missing.map((s) => ({ field: 'itemSkus', message: `SKU does not exist: ${s}` })));
        }

        // Items left on a shelf that no longer exists, and not moved by this payload
        const stranded = new Set();
        for (const { sku, shelf_id } of mapModel.itemShelves()) {
            if (!shelfIds.has(shelf_id) && !skuToShelf.has(sku)) stranded.add(shelf_id);
        }
        if (stranded.size) {
            throw new AppError(422, 'SHELVES_IN_USE', 'Map would remove shelves that still have items',
                [...stranded].map((id) => ({ field: 'shelves', message: `Shelf ${id} still has items` })));
        }
        const version = store.version + 1;
        mapModel.apply({ storeId: store.store_id, version, payload: body, skuToShelf });

        logModel.write({
            action: 'update',
            entityType: 'map',
            entityId: `${store.store_id}@v${version}`,
            performedBy: role,
            details: { version, shelves: shelfIds.size, itemsMoved: skuToShelf.size },
        });
    })();

    return exports.getEditor();    // fresh state, with the new baseVersion
};