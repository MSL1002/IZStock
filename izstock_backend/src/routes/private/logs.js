const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const logService = require('../../services/logService');

router.get('/', asyncHandler(async (req, res) => {
    res.json(logService.get(req.query))
}))

module.exports = router;