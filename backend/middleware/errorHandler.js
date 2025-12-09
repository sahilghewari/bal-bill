const logger = require('./logger');

const buildErrorId = () => `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const errorHandler = (err, req, res, next) => {
  const errorId = err.errorId || buildErrorId();

  logger.error('Unhandled error', {
    error_id: errorId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user_agent: req.get('user-agent'),
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    error_id: errorId,
    ...(isDevelopment && { details: err.stack }),
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
