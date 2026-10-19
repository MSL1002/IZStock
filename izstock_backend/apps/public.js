const express = require('express');
const limit = require('../src/middleware/rateLimit');
const { errorHandler, notFound } = require('../src/middleware/errorHandler');
const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '50kb' }))
app.use(limit.general);


app.use(express.json());

app.use('/items/suggest', limits.suggest);
app.use(['/auth/register', '/auth/login', '/auth/verify'], limits.auth);
app.use(['/auth/register', '/auth/login'], limits.smsPerPhone);

app.use('/items', require('../src/routes/public/items'));
app.use('/map', require('../src/routes/public/map'));
app.use('/auth', require('../src/routes/public/auth'));
app.use('/me', require('../src/routes/public/me'));

// if else, 404
app.use(notFound);
app.use(errorHandler);

module.exports = app;