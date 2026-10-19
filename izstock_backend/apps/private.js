const express = require('express');
const { errorHandler, notFound } = require('../src/middleware/errorHandler');
const cors = require('cors');

const config = require('../src/config/')
const requireManager = require('../src/middleware/requireManager');

const app = express();
app.use(cors({ origin: config.dashboardOrigins[1] })); // React dev origin
app.use(express.json());

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