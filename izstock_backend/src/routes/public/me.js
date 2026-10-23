// Get and set the user's list in the database
const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const requireSession = require('../../middleware/requireSession');
const listModel = require('../../models/listModel');

router.use(requireSession);

router.get('/list', (req, res) => {
    const list = listModel.getUserList(req.user_id);
    if(list.length === 0) return res.status(200).json({ list: 'No items in this list' })
    res.status(200).json(listModel.getUserList(req.user_id));
});

router.put('/list', (req, res) => {
    res.json(listModel.replaceList(req.user_id, req.body.items));
});

module.exports = router;