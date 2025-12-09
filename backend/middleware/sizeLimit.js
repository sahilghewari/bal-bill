const logger = require('./logger');

const sizeLimitMiddleware = (req, res, next) => {
  const MAX_REQUEST_SIZE = parseInt(process.env.MAX_REQUEST_SIZE, 10) || 1024 * 100;
  const contentLength = parseInt(req.get('content-length') || 0, 10);

  if (contentLength > MAX_REQUEST_SIZE) {
    logger.warn('Request exceeds size limit', {
      size: contentLength,
      limit: MAX_REQUEST_SIZE,
      path: req.path,
      ip: req.ip,
    });

    return res.status(413).json({
      error: 'Request entity too large',
      max_size: MAX_REQUEST_SIZE,
    });
  }

  next();
};

module.exports = {
  sizeLimitMiddleware,
};
