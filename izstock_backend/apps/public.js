const express = require('express');
const app = express();

app.use(express.json());

app.use('/items', require('../src/routes/public/items'));
app.use('/map', require('../src/routes/public/map'));
// app.use('/auth', require('../src/routes/public/auth'));
// app.use('/me', require('../src/routes/public/me'));

// if else, 404
app.use((req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } })
);

module.exports = app;