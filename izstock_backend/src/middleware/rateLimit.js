const rateLimit = import('express-rate-limit');

const handler = (req, res) =>
  res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.', details: [] },
  });

const make = (windowMs, limit, extra = {}) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, handler, ...extra });

module.exports = {
  general: make(60_000, 120),                 // all public routes
  suggest: make(60_000, 300),                 // autocomplete fires per keystroke
  auth: make(15 * 60_000, 10),                // per IP: register/login/verify
  smsPerPhone: make(60 * 60_000, 5, {         // per phone: protects Twilio credit
    keyGenerator: (req) => `phone:${String(req.body?.phone ?? '').replace(/\D/g, '')}`,
  }),
  managerUnlock: make(15 * 60_000, 5),        // brute-force guard on the 8-char code
};