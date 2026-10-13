exports.notFound = (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}`});
}

exports.errorHandler = (err, req, res, next) => {
  // express.json() throws on bad JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'MALFORMED_REQUEST', message: 'Invalid JSON body' } });
  }
  if (!err.code || !err.status) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
  res.status(err.status).json({
    error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
  });
};