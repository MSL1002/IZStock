const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const requireManager = require('../../middleware/requireManager');
const managerService = require('../../services/managerService');

router.post('/unlock', asyncHandler(async (req, res) => {
  res.json(managerService.unlock(req.body));
}));

router.post('/lock', requireManager, (req, res) => {
  managerService.lock(req.managerToken);
  res.status(204).end();
});

module.exports = router;