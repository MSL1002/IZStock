const {AppError} = require('../errors');
const managerTokens = require('../lib/managerTokens');

module.exports = (req, res, next) => {
  const m = /^Bearer (.+)$/.exec(req.get('Authorization') || '');
  if (!m || !managerTokens.isValid(m[1])) {
    return next(new AppError(403, 'FORBIDDEN', 'Manager token missing or expired'));
  }
  req.managerToken = m[1];
  next();
};