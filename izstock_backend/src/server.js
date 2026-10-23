const public = require('../apps/public');
const private = require('../apps/private');
const config = require('./config');

// Public: ngrok forwards to public_port
public.listen(config.public_port, () => console.log(`Public API on: ${config.public_port}`));

// Private: reachable from other devices on the store's LAN
private.listen(config.private_port, '0.0.0.0', () => console.log(`Private API on: ${config.private_port}`));
