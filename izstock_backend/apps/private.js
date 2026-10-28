const express = require('express');
const helmet = require('helmet');
const { errorHandler, notFound } = require('../src/middleware/errorHandler');
const lanOnly = require('../src/middleware/lanOnly');
const cors = require('cors');

const config = require('../src/config/')
const requireManager = require('../src/middleware/requireManager');

const app = express();
app.use(lanOnly);
app.use(helmet());
app.use(cors({
  origin: (origin, cb) =>
    !origin || config.dashboardOrigins.includes(origin) ? cb(null, true) : cb(new Error('CORS blocked')),
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Manager-Token'],
}));
app.use(express.json({limit: '1mb'}));

app.use('/items', require('../src/routes/private/items'));
app.use('/manager', require('../src/routes/private/manager'));
app.use('/logs', require('../src/routes/private/logs'));
app.use('/health', require('../src/routes/private/health'));

// Manager-only routes
app.use('/map', requireManager, require('../src/routes/private/map'));
app.use('/locations', requireManager, require('../src/routes/private/locations'));

// if else, 404
app.use(notFound);
app.use(errorHandler);

module.exports = app;