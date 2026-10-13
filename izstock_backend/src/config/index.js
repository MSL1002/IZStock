require('dotenv').config();

module.exports = {
    public_port: process.env.PUBLIC_PORT || 3000,
    private_port: process.env.PRIVATE_PORT || 4000,
    dbPath: process.env.DB_PATH || 'data/izstock.db',
    smsMode: process.env.SMS_MODE || 'console',
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_FROM_NUMBER || ''
    }
}