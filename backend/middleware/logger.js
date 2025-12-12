const winston = require('winston');
require('dotenv').config();

const subscribers = new Set();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'telecom-billing' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...rest }) => {
          const metadata = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metadata}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

const originalLog = logger.log.bind(logger);
logger.log = (info, ...metaArgs) => {
  let entry = info;

  if (typeof info === 'string') {
    const [meta = {}] = metaArgs;
    entry = {
      level: typeof meta.level === 'string' ? meta.level : logger.level || 'info',
      message: info,
      ...meta,
    };
  }

  const meta = { ...entry };
  delete meta.level;
  delete meta.message;

  const payload = {
    level: entry.level,
    message: entry.message,
    meta,
    timestamp: meta.timestamp || new Date().toISOString(),
  };

  subscribers.forEach((subscriber) => {
    try {
      subscriber(payload);
    } catch (error) {
      // Avoid recursive logging
    }
  });

  return originalLog(entry);
};

logger.subscribe = (handler) => {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
};

logger.unsubscribe = (handler) => {
  subscribers.delete(handler);
};

module.exports = logger;
