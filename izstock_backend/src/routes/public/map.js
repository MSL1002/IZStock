// Get the current map
const router = require('express').Router();
const mapModel = require('../../models/mapModel');

router.get('/', (req, res) => {
    const map = mapModel.getMap();
    res.json(map);
});

router.get('/version', (req, res) => {
    const version = mapModel.getVersion();
    res.json({ version: version });
});


module.exports = router;