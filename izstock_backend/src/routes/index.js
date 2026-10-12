const router = require('express').Router();
const db = require('../db');

router.get('/health', (req, res) => {
    try{
        db.prepare('SELECT 1').get();
        res.json({status: 'ok'});
    }
    catch(e){
        res.json({status: "Unable to get anything form the database.\nEnsure the database is set up properly."})
    }
})

router.use('/items', require('./public/items.js'));

module.exports = router;