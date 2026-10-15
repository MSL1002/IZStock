// src/services/logService.js
const { AppError } = require('../errors');
const logModel = require('../models/logModel');
const { parsePagination, buildPage } = require('../utils/pagination');

const ACTIONS = ['create', 'update', 'delete', 'batch_delete', 'move', 'move_shelf', 'move_aisle'];

const bad = (field, message) => {
    new AppError(422, 'VALIDATION_FAILED', message, [{ field, message }]);
}

const parseDate = (value, field) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        throw bad(field, `${field} must be an ISO 8601 date-time`);
    }
    return value;
};

exports.get = (query) => {
    const pg = parsePagination(query, { defaultSize: 10 });

    const action = query.action;
    if (action !== undefined && !ACTIONS.includes(action)) {
        throw bad('action', `action must be one of: ${ACTIONS.join(', ')}`);
    }

    const from = parseDate(query.from, 'from');
    const to = parseDate(query.to, 'to');
    if (from && to && Date.parse(from) > Date.parse(to)) {
        throw bad('from', 'from must be <= to');
    }

    const { items, total } = logModel.list({
        action,
        sku: query.sku?.trim() || undefined,
        from,
        to,
        pageSize: pg.pageSize,
        offset: pg.offset,
    });
    return buildPage(items, total, pg);
};