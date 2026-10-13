const { AppError } = require('../errors');

const bad = (field, message) =>
  new AppError(422, 'VALIDATION_FAILED', message, [{ field, message }]);

exports.parsePagination = (query, { defaultSize = 25, maxSize = 100 } = {}) => {
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? defaultSize : Number(query.pageSize);

  if (!Number.isInteger(page) || page < 1) throw bad('page', 'page must be an integer >= 1');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxSize) {
    throw bad('pageSize', `pageSize must be an integer from 1 to ${maxSize}`);
  }
  return { page, pageSize, offset: (page - 1) * pageSize };
};

exports.buildPage = (items, total, { page, pageSize }) => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});