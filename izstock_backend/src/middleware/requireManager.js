const AppError = require('../errors');
const managerTokens = require('../lib/managerTokens');

module.exports = (req, res, next) => {
  const token = req.get('X-Manager-Token');
  if (!token || !managerTokens.isValid(token)) {
    return next(new AppError(403, 'FORBIDDEN', 'Manager token missing or expired'));
  }
  req.managerToken = token;
  next();
};