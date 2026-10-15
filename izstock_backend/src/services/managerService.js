const crypto = require('crypto');
const db = require('../db.js');
const {AppError} = require('../errors.js');
const managerTokens = require('../lib/managerTokens');

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000;
let fails = [];   // timestamps of recent failed attempts (single store, so one counter)

const hashCode = (code) =>
  crypto.createHmac('sha256', process.env.CODE_PEPPER).update(code).digest('hex');

exports.unlock = (body) => {
  const code = body?.code;
  if (typeof code !== 'string' || code.length !== 8) {
    throw new AppError(422, 'VALIDATION_FAILED', 'code must be an 8 character string');
  }

  const now = Date.now();
  fails = fails.filter((t) => now - t < WINDOW_MS);
  if (fails.length >= MAX_FAILS) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Try again later');
  }

  const store = db.prepare('SELECT manager_code_hash FROM stores LIMIT 1').get();
  const a = Buffer.from(hashCode(code));
  const b = Buffer.from(store?.manager_code_hash ?? '');
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!ok) {
    fails.push(now);
    throw new AppError(401, 'INVALID_CODE', 'That manager code is incorrect');
  }
  fails = [];
  return managerTokens.issue();
};

exports.lock = (token) => managerTokens.revoke(token);