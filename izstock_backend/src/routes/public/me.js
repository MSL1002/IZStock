// Get and set the user's list in the database
const router = require('express').Router();
const asyncHandler = require('../../middleware/asyncHandler');
const requireSession = require('../../middleware/requireSession');
const listModel = require('../../models/listModel');

router.get('/list', asyncHandler(async (req, res) => {
    listModel.getUserList(req.body.user_id)
    res.status(200).json({message: 'List gotten'})
}));

router.put('/list', (req, res) => {
    listModel.replace(req.body.user_id, req.body.items);
    res.status(200);
});