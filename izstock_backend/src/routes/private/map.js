const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const requireManager = require('../../middleware/requireManager');
const mapService = require('../../services/mapService');

router.use(requireManager);

router.get('/', asyncHandler(async (req, res) => {
    res.json(mapService.getEditor());
}));

router.put('/', asyncHandler(async (req, res) => {
    res.json(mapService.save(req.body, 'manager'));
}));

module.exports = router;