const crypto = require('crypto');
const { AppError } = require('../errors');
const userModel = require('../models/userModel');
const codeModel = require('../models/verificationCodeModel');
const sessionModel = require('../models/sessionModel');
const Email = require('./emailService');
const validator = require('email-validator')
const { log } = require('console');

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
exports.hashToken = sha256;

// helper functions
const invalid = (field, message) => {
    new AppError('422', 'VALIDATION_FAILED', message, [{ field, message }]);
}

function checkBody(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'MALFORMED_REQUEST', 'Request body must be a JSON object');
  }
  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length) {
    throw new AppError(400, 'MALFORMED_REQUEST', `Unknown field(s): ${extra.join(', ')}`);
  }
}

function checkEmail(email){
  if(!validator.validate(email)){
    throw new AppError(422, 'VALIDATION_FAILED', 'Invalid email address', [{field: 'email'}])
  }
  return email;
}

function cleanName(value, field) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (s.length < 1 || s.length > 50) throw new AppError(422, 'VALIDATION_FAILED', `${field} must be 1 - 50 characters in length.`, [{ field: field }])
  return s;
}

async function issueCode(userId, email, purpose) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  codeModel.createReplacing({
    userId,
    codeHash: sha256(code),
    purpose,
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  try{
    await Email.sendCode(email, code);
  }
  catch(e){
    console.log('failed on sendCode: ' + e);
    throw e;
  }
  
}

// Service functions
exports.register = async (body) => {
  checkBody(body, ['email', 'firstName', 'lastName']);

  const email = checkEmail(body.email);
  console.log('email ' + email)
  const firstName = cleanName(body.firstName, 'firstName');
  console.log('fname ' + firstName)
  const lastName = cleanName(body.lastName, 'lastName');
  console.log('lname ' + lastName)

  const existing = userModel.findByEmail(email);
  if (existing?.verified) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account already uses this email');
  }

  // An unverified leftover from an abandoned signup is reused, not duplicated
  let userId;
  if (existing) {
    userId = existing.id;
    userModel.updateName(userId, firstName, lastName);
  } else {
    userId = userModel.create({ email, firstName, lastName });
  }
  try{
    await issueCode(userId, email, 'registration');
  }
  catch (e){
    console.log('IssueCode failed: ' + e);
    throw e;
  }
  
};

exports.login = async (body) => {

  checkBody(body, ['email']);
  const email = checkEmail(body.email);
  const user = userModel.findByEmail(email);

  if(!user || !user.verified) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No verified account found for this email');
  }
  await issueCode(user.id, email, 'sign_in');
}

exports.verify = (body) => {
    checkBody(body, ['email', 'code']);
    const email = checkEmail(body.email);
    if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
        throw invalid('code', 'Code must be a 6-digit string');
    }
    console.log(email);
    const user = userModel.findByEmail(email);
    console.log(user)
    const record = user && codeModel.findActive(user.id);
    if (!record) {
        throw new AppError(404, 'INVALID_CODE', 'Incorrect or expired code');
    }
    
    if(new Date(record.expires_at) < new Date() || record.attempts >= MAX_ATTEMPTS) {
        throw new AppError(401, 'CODE_EXPIRED', 'The code has expired. Request a new one.');
    }

    const expected = Buffer.from(record.code_hash, 'hex');
    const actual = Buffer.from(sha256(body.code), 'hex');
    if(!crypto.timingSafeEqual(expected, actual)) {
        codeModel.incrementAttempts(record.id);
        throw new AppError(401, 'INVALID_CODE', 'Incorrect code');
    }

    codeModel.markUsed(record.id);
    if (!user.verified) {
        userModel.markVerified(user.id);
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessionModel.create({
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
    });

    return {
        token,
        user: {
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email_number
        }
    }
};

exports.logout = (tokenHash) => {
  sessionModel.delete(tokenHash);
}