const router = require('express').Router();
const itemModel = require('../../models/itemModel');
const { parsePagination, buildPage } = require('../../utils/pagination');

// search an item by it's name
router.get('/search', (req, res) => {
  const name = req.query.name?.trim();
  if (!name || name.length > 100) throw appError(400, 'BAD_REQUEST', 'Query parameter "name" is required and must be less than 100 characters.');
  const p = parsePagination(
    { page: req.query.page, pageSize: req.query.limit },
    { defaultSize: 20, maxSize: 50 }
  );
  const { items, total } = itemModel.list({ name, ...p });
  res.json(buildPage(items, total, p));
});

// shortened list of all items that start with the given chars
router.get('/suggest', (req, res) => {
    const item = itemModel.suggestByName(req.query.name, req.query.limit ? parseInt(req.query.limit) : 10);
    if(!item) return res.status(404).json({ error: `Item with name ${req.query.name} not found` });
    res.json(item);
});

// find items by a list of SKUs
// useful for looking up user's lists
router.post('/lookup', (req, res) => {
    const skus = req.body.skus;
    if(!skus || !Array.isArray(skus)) return res.status(400).json({ error: 'Invalid request body' });
    const items = skus.map((sku) => itemModel.findBySku(sku)).filter(Boolean);
    res.json(items);
});

// get an item by it's sku
router.get('/:sku', (req, res) => {
    const item = itemModel.findBySku(req.params.sku);
    if(!item) return res.status(404).json({ error: `Item with SKU ${req.params.sku} not found` });
    res.json(item);
});


module.exports = router;