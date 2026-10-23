require('dotenv').config();

const verificationMode = process.env.VERIFICATION_MODE || 'console';
if (!['console', 'email'].includes(verificationMode)) {
  console.error(`VERIFICATION_MODE must be "console" or "email", got "${verificationMode}"`);
  process.exit(1);
}

const required = ['DB_PATH'];
if (verificationMode === 'email') {
  required.push('MAILGUN_API_KEY', 'MG_SANDBOX_DOMAIN', 'MG_BASE_URL');
}

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv === 'production' && verificationMode === 'console') {
  console.error('VERIFICATION_MODE=console is not allowed when NODE_ENV=production');
  process.exit(1);
}
if (nodeEnv === 'development' && verificationMode === 'email') {
  console.warn('Development should use console code output to save email credits.');
}


module.exports = {
    nodeEnv: process.env.NODE_ENV,
    public_port: process.env.PUBLIC_PORT || 3000,
    private_port: process.env.PRIVATE_PORT || 4000,
    dbPath: process.env.DB_PATH,
    dashboardOrigins: (process.env.DASHBOARD_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    verificationMode: process.env.VERIFICATION_MODE,
    mailgun: {
        apiKey: process.env.MAILGUN_API_KEY,
        sandboxDomain: process.env.MG_SANDBOX_DOMAIN,
        baseURL: process.env.MG_BASE_URL,
    },
};