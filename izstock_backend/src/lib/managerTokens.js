const crypto = require('crypto');

const TTL_MS = 30 * 60_000;
const tokens = new Map();   // sha256(token) -> expiresAt (ms)

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

exports.issue = () => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + TTL_MS;
  tokens.set(hash(token), expiresAt);
  return { token, expiresAt: new Date(expiresAt).toISOString() };
};

exports.isValid = (token) => {
  const h = hash(token);
  const exp = tokens.get(h);
  if (!exp) return false;
  if (exp < Date.now()) { tokens.delete(h); return false; }
  return true;
};

exports.revoke = (token) => tokens.delete(hash(token));