const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const locationService = require('../../services/locationService');
const requireManager = require('../../middleware/requireManager');
const mapService = require('../../services/mapService')

router.get('/', asyncHandler(async (req, res) => {
    res.json(mapService.getLocations());
}));

router.patch('/move-shelf', requireManager, asyncHandler(async (req, res) => {
    res.json(locationService.moveShelves(req.body, 'manager'));
}));

router.patch('/move-aisle', requireManager, asyncHandler(async (req, res) => {
    res.json(locationService.moveAisles(req.body, 'manager'));
}));

module.exports = router;