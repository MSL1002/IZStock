exports.notFound = (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}`});
}

exports.errorHandler = (err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({
        error: status === 500 ? 'Internal server error' : err.message,
    })
}