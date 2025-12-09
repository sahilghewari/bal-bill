const logger = require('./logger');

const buildErrorDetails = (details) =>
  details.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

const validateRequest = (validator) => {
  return (req, res, next) => {
    const { error, value } = validator(req.body);

    if (error) {
      logger.warn('Validation failed', {
        path: req.path,
        errors: error.details.map((detail) => detail.message),
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: buildErrorDetails(error.details),
      });
    }

    req.validatedBody = value;
    next();
  };
};

const validateQuery = (validator) => {
  return (req, res, next) => {
    const { error, value } = validator(req.query);

    if (error) {
      logger.warn('Query validation failed', {
        path: req.path,
        errors: error.details.map((detail) => detail.message),
      });

      return res.status(400).json({
        error: 'Invalid query parameters',
        details: buildErrorDetails(error.details),
      });
    }

    req.validatedQuery = value;
    next();
  };
};

module.exports = {
  validateRequest,
  validateQuery,
};
