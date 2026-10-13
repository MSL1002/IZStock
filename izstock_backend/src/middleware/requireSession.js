const {AppError} = require('../errors');
const sessionModel = require('../models/sessionModel');
const { hashToken } = require('../services/authService');

module.exports = (req, res, next) => {
    const [scheme, token] = (req.get('Authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
        throw new AppError(401, 'UNAUTHORIZED', 'Auth header missing or malformed.');
    }
    const tokenHash = hashToken(token);
    const session = sessionModel.findValid(tokenHash);
    if (!session) {
        throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid session token.');
    }
    req.user = {
        id: session.id,
        firstName: session.first_name,
        lastName: session.last_name
    }
    req.tokenHash = tokenHash;
    next();
}