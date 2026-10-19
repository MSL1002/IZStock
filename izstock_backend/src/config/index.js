require('dotenv').config();

const smsMode = process.env.SMS_MODE || 'console';
if (!['console', 'twilio'].includes(smsMode)) {
  console.error(`SMS_MODE must be "console" or "twilio", got "${smsMode}"`);
  process.exit(1);
}

const required = ['DB_PATH'];
if (smsMode === 'twilio') {
  required.push('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER');
}

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}
if (nodeEnv === 'production' && smsMode === 'console') {
  console.error('SMS_MODE=console is not allowed when NODE_ENV=production');
  process.exit(1);
}

module.exports = {
    nodeEnv: process.env.NODE_ENV,
    publicPort: Number(process.env.PUBLIC_PORT) || 3000,
    privatePort: Number(process.env.PRIVATE_PORT) || 4000,
    dbPath: process.env.DB_PATH,
    dashboardOrigins: (process.env.DASHBOARD_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    smsMode,
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
};