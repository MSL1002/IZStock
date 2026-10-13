const config = require('../config');
const { AppError } = require('../errors');

let client;

exports.sendCode = async (phone, code) => {
  if (config.smsMode === 'console') {
    console.log(`[SMS dev mode] to ${phone}: ${code}`);
    return;
  }
  try {
    client ||= require('twilio')(config.twilio.sid, config.twilio.token);
    await client.messages.create({
      to: phone,
      from: config.twilio.from,
      body: `Your IZStock code is ${code}. It expires in 5 minutes.`,
    });
  } catch (err) {
    console.error('Twilio error:', err.message);
    throw new AppError(502, 'SMS_FAILED', 'Could not send the text message. Please try again.');
  }
};