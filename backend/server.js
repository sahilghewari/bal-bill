const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Load and validate configuration
const config = require('./config/environments');

const logger = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizerMiddleware } = require('./middleware/sanitizer');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { securityHeadersMiddleware } = require('./middleware/securityHeaders');
const { sizeLimitMiddleware } = require('./middleware/sizeLimit');
const initializeScheduler = require('./tasks/initializeScheduler');
const { pool } = require('./config/database');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(securityHeadersMiddleware);
app.use(sizeLimitMiddleware);

// CORS configuration
app.use(cors(config.cors));

// Rate limiting
app.use(
  createRateLimiter(
    config.security.rateLimitRequests,
    config.security.rateLimitWindowMs
  )
);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
    });
  });

  next();
});

// Webhook (before body parser)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  req.rawBody = req.body;
  const stripeController = require('./controllers/stripeController');
  stripeController.handleWebhook(req, res);
});

// Body parsing
app.use(express.json({ limit: config.security.maxRequestSize }));
app.use(express.urlencoded({ limit: config.security.maxRequestSize, extended: true }));

// Sanitization
app.use(sanitizerMiddleware);

// Routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/rateCards', require('./routes/rateCards'));
app.use('/api/cdrs', require('./routes/cdrs'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/scheduler', require('./routes/scheduler'));
app.use('/api/admin', require('./routes/admin'));

// Health check with detailed info
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    environment: config.nodeEnv,
    uptime: process.uptime(),
  });
});

// Ready check (used for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');

    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not-ready',
      error: 'Database connection failed',
    });
  }
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

const startServer = () => {
  const listenHost = process.env.HOST || '0.0.0.0';

  const server = app.listen(config.port, listenHost, () => {
    logger.info(`🚀 Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(
      `Database: ${config.database.host}:${config.database.port}/${config.database.name}`
    );

    // Initialize scheduler
    try {
      if (config.nodeEnv === 'production') {
        initializeScheduler();
      }
    } catch (error) {
      logger.error('Failed to initialize scheduler', { error: error.message });
    }
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    logger.info('Graceful shutdown initiated...');

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await pool.end();
        logger.info('Database connections closed');
      } catch (error) {
        logger.error('Error closing database', { error: error.message });
      }

      logger.info('Application shutdown complete');
      if (!process.env.DISABLE_AUTO_EXIT) {
        process.exit(0);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return server;
};

if (require.main === module) {
  startServer();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise,
  });
  process.exit(1);
});

module.exports = app;
