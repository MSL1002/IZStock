const router = require('express').Router();
const db = require('../db');

router.get('/health', (req, res) => {
    db.prepare('SELECT 1').get();
    res.json({status: 'ok'});
})

router.use('/items', require('./items.js'));

module.exports = router;