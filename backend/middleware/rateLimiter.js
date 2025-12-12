const logger = require('./logger');

const requestCounts = {};

const cleanupInterval = setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  Object.keys(requestCounts).forEach((ip) => {
    if (requestCounts[ip].timestamp < oneHourAgo) {
      delete requestCounts[ip];
    }
  });
}, 60 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

const createRateLimiter = (maxRequests = 100, windowMs = 60 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';

    if (!requestCounts[ip]) {
      requestCounts[ip] = {
        count: 0,
        timestamp: Date.now(),
      };
    }

    const now = Date.now();
    const timeSinceReset = now - requestCounts[ip].timestamp;

    if (timeSinceReset > windowMs) {
      requestCounts[ip] = {
        count: 0,
        timestamp: now,
      };
    }

    requestCounts[ip].count += 1;

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCounts[ip].count));
    res.setHeader('X-RateLimit-Reset', new Date(requestCounts[ip].timestamp + windowMs).toISOString());

    if (requestCounts[ip].count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip,
        requests: requestCounts[ip].count,
        limit: maxRequests,
      });

      const retryAfter = Math.ceil((requestCounts[ip].timestamp + windowMs - now) / 1000);

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter,
      });
    }

    next();
  };
};

module.exports = {
  createRateLimiter,
};
