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

  const env = {
    // Server
    port: process.env.PORT || 5000,
    nodeEnv,

    // Database
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      name: process.env.DB_NAME || 'telecom_billing',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
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
