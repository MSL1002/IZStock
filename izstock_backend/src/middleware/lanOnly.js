const PRIVATE = [
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/, /^::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/,
];

module.exports = (req, res, next) => {
    const ip = req.socket.remoteAddress || '';
    if (PRIVATE.some((re) => re.test(ip))) return next();
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not allowed.', details: [] } });
}