const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const requireManager = require('../../middleware/requireManager');
const locationService = require('../../services/locationService');

router.use(requireManager);

router.patch('/move-shelf', asyncHandler(async (req, res) => {
    res.json(locationService.moveShelves(req.body, 'manager'));
}));

router.patch('/move-aisle', asyncHandler(async (req, res) => {
    res.json(locationService.moveAisles(req.body, 'manager'));
}));

module.exports = router;