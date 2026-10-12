const express = require('express');
const cors = require('cors');
// const requireManager = require('../middleware/requireManager');

const app = express();
app.use(cors({ origin: '' })); // React dev origin
app.use(express.json());

// app.use('/items', require('../src/routes/private/items'));
// app.use('/manager', require('../src/routes/private/manager'));
// app.use('/logs', require('../src/routes/private/logs'));
app.use('/health', require('../src/routes/private/health'));

// Manager-only routes
// app.use('/map', requireManager, require('../src/routes/private/map'));
// app.use('/locations', requireManager, require('../src/routes/private/locations'));

module.exports = app;