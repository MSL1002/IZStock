const router = require('express').Router();
const db = require('../../db');

router.use('/items', require('./public/items.js'));
router.use('/health', require('./private/health.js'));

module.exports = router;