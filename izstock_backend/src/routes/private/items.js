const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const itemAdminService = require('../../services/itemAdminService');
const { parsePagination, buildPage } = require('../../utils/pagination')

const role = (req) => (/^Bearer .+/.test(req.get('Authorization') || '') ? 'manager' : 'employee');

router.get('/', asyncHandler(async (req, res) => {
  res.json(itemAdminService.list(req.query));
}));

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(itemAdminService.create(req.body, role(req)));
}));

router.post('/batch-delete', asyncHandler(async (req, res) => {
  res.json(itemAdminService.batchDelete(req.body, role(req)));
}));

router.patch('/:sku', asyncHandler(async (req, res) => {
  res.json(itemAdminService.update(req.params.sku, req.body, role(req)));
}));

router.delete('/:sku', asyncHandler(async (req, res) => {
  itemAdminService.remove(req.params.sku, role(req));
  res.status(204).end();
}));

module.exports = router;