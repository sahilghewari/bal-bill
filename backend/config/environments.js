require('dotenv').config();
const logger = require('../middleware/logger');

/**
 * Load and validate environment variables
 */
const loadEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const fallbackDevOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const defaultCorsOrigin =
    nodeEnv === 'production'
      ? 'http://localhost:3000'
      : fallbackDevOrigins.join(',');

  const resolvedCorsOrigins = (process.env.CORS_ORIGIN || defaultCorsOrigin)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const normalizeDbPassword = (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      logger.warn('Coercing DB_PASSWORD value to string');
      return String(value);
    }

    throw new Error('DB_PASSWORD must be a string value');
  };

  const env = {
    // Server
    port: process.env.PORT || 5000,
    nodeEnv,

    // Database
    database: {
      host: process.env.DB_HOST ||
        (process.env.NODE_ENV === 'development' && process.env.USE_HOST_DOCKER_INTERNAL === 'true'
          ? 'host.docker.internal'
          : 'localhost'),
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      name: process.env.DB_NAME || 'telecom_billing',
      user: process.env.DB_USER || 'postgres',
      password: normalizeDbPassword(process.env.DB_PASSWORD),
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 2000,
    },

    // Stripe
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },

    // Queue / Scheduler
    queue: {
      redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      enabled: process.env.ENABLE_QUEUE !== 'false',
    },

    // CORS
    cors: {
      origin: resolvedCorsOrigins,
      credentials: true,
    },

    // Logging
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },

    // Security
    security: {
      maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE, 10) || 102400,
      rateLimitRequests:
        parseInt(process.env.RATE_LIMIT_REQUESTS, 10)
        || (nodeEnv === 'production' ? 100 : 1000),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 3600000,
    },
  };

  // Validate required variables in production
  if (env.nodeEnv === 'production') {
    const required = [
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    logger.info('Production environment variables validated \u2713');
  }

  return env;
};

module.exports = loadEnv();
