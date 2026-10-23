const db = require('../db.js');
const {AppError} = require('../errors.js');
const itemModel = require('../models/itemModel');
const logModel = require('../models/logModel.js');
const { parsePagination, buildPage } = require('../utils/pagination.js');

const bad = (msg, field) => new AppError(422, 'VALIDATION_FAILED', msg, field && [{ field }]);

const assertKnownFields = (body, allowed) => {
  const unknown = Object.keys(body ?? {}).filter((k) => !allowed.includes(k));
  if (unknown.length) throw new AppError(400, 'MALFORMED_REQUEST', 'Unknown field(s) in body', unknown);
};

const validName = (v) => typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 120;
const validPrice = (v) => typeof v === 'number' && v >= 0 && Math.round(v * 100) === v * 100;
const validQty = (v) => Number.isInteger(v) && v >= 0;
const validImage = (v) => v === null || (typeof v === 'string' && /^https?:\/\//.test(v));

exports.create = (body, role) => {
    assertKnownFields(body, ['sku', 'name', 'price', 'quantity', 'shelfId', 'imageUrl']);
    const sku = String(body?.sku ?? '').trim();
    if (!sku || sku.length > 100) throw bad('sku must be 1 to 100 characters', 'sku');
    if (!validName(body.name)) throw bad('name must be 1 to 120 characters', 'name');
    if (!validPrice(body.price)) throw bad('price must be >= 0 with at most 2 decimals', 'price');
    if (!validQty(body.quantity)) throw bad('quantity must be an integer >= 0', 'quantity');
    if (body.imageUrl !== undefined && !validImage(body.imageUrl)) throw bad('imageUrl must be an http(s) URL or null', 'imageUrl');
    if (!itemModel.shelfExists(body.shelfId)) {
        throw new AppError(422, 'SHELF_NOT_FOUND', 'shelfId is not on the published map');
    }
    if (itemModel.findBySku(sku)) throw new AppError(409, 'SKU_EXISTS', 'An item with that SKU already exists');

    const item = {
        sku, name: body.name.trim(), price: body.price, quantity: body.quantity,
        shelfId: body.shelfId, imageUrl: body.imageUrl ?? null,
    };
    db.transaction(() => {
        itemModel.create(item);
        logModel.write({ action: 'create', entityType: 'item', entityId: sku, performedBy: role });
    })();
    return itemModel.findBySku(sku);
};

exports.update = (sku, body, role) => {
    assertKnownFields(body, ['name', 'price', 'quantity', 'imageUrl']);
    if (!itemModel.findBySku(sku)) throw new AppError(404, 'NOT_FOUND', 'Item not found');

    if (body.name !== undefined && !validName(body.name)) throw bad('name must be 1 to 120 characters', 'name');
    if (body.price !== undefined && !validPrice(body.price)) throw bad('price must be >= 0 with at most 2 decimals', 'price');
    if (body.quantity !== undefined && !validQty(body.quantity)) throw bad('quantity must be an integer >= 0', 'quantity');
    if (body.imageUrl !== undefined && !validImage(body.imageUrl)) throw bad('imageUrl must be an http(s) URL or null', 'imageUrl');

    db.transaction(() => {
        itemModel.update(sku, body);
        logModel.write({ action: 'update', entityType: 'item', entityId: sku, performedBy: role, details: body });
    })();
    return itemModel.findBySku(sku);
};

exports.remove = (sku, role) => {
    db.transaction(() => {
        if (!itemModel.remove(sku)) throw new AppError(404, 'NOT_FOUND', 'Item not found');
        logModel.write({ action: 'delete', entityType: 'item', entityId: sku, performedBy: role });
    })();
};

exports.batchDelete = (body, role) => {
    assertKnownFields(body, ['skus']);
    if (!Array.isArray(body?.skus) || body.skus.length < 1 || body.skus.length > 500
        || !body.skus.every((s) => typeof s === 'string' && s.trim())) {
        throw bad('skus must be an array of 1 to 500 strings', 'skus');
    }
    const skus = [...new Set(body.skus.map((s) => s.trim()))];

    db.transaction(() => {
        const missing = itemModel.missingSkus(skus);
        if (missing.length) {
        throw new AppError(422, 'SKUS_NOT_FOUND', 'One or more SKUs do not exist',
            missing.map((s) => ({ field: 'skus', message: `SKU does not exist: ${s}` })));
        }
        skus.forEach((s) => itemModel.remove(s));
        logModel.write({ action: 'batch_delete', entityType: 'item', entityId: 'batch',
                        performedBy: role, details: { skus } });
    })();
    return { deleted: skus.length };
};

exports.list = (query) => {
    console.log(query.pg)
    const pg = parsePagination(query, {defaultSize:15});
    const { items, total } = itemModel.list({
        name: query.q?.trim() || undefined,
        aisle: query.aisle?.trim() || undefined,
        pageSize: pg.pageSize,
        offset: pg.offset,
    });
    return buildPage(items, total, pg);
};