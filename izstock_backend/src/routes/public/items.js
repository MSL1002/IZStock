const router = require('express').Router();
const itemModel = require('../../models/itemModel');

// search an item by it's name
router.get('/search', (req, res) => {
    const item = itemModel.searchByName(`%${req.query.name}%`, 20);
    if(!item) return res.status(404).json({ error: `Item with name ${req.query.name} not found` });
    res.json(item);
});

// shortened list of all items that start with the given chars
router.get('/suggest', (req, res) => {
    const item = itemModel.suggestByName(req.query.name, 5);
    if(!item) return res.status(404).json({ error: `Item with name ${req.query.name} not found` });
    res.json(item);
});

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