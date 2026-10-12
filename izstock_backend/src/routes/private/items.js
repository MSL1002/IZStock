const router = require('express');
const itemModel = require('../../models/itemModel');

router.get('/:sku', (req, res) => {
    const item = itemModel.findBySku(req.params.sku);
    if(!item) return res.status(404).json({ error: `Item with SKU ${req.params.sku} not found` });
    res.json(item);
})

module.exports = router;