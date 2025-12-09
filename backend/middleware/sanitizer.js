const logger = require('./logger');

/**
 * Sanitize input strings to prevent XSS and injection attacks
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(/[<>]/g, '')
    .replace(/['"`]/g, '')
    .trim();
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') return sanitizeString(obj);
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  Object.keys(obj).forEach((key) => {
    sanitized[key] = sanitizeObject(obj[key]);
  });

  return sanitized;
};

/**
 * Middleware to sanitize request body, query, and params
 */
const sanitizerMiddleware = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Sanitization error', { error: error.message });
    res.status(400).json({
      error: 'Invalid request format',
    });
  }
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizerMiddleware,
};
