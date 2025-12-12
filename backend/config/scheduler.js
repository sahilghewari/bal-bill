const os = require('os');
const logger = require('../middleware/logger');

let Bull;
try {
  // eslint-disable-next-line global-require
  Bull = require('bull');
} catch (error) {
  logger.warn('Bull queue dependency not installed; scheduler running in stub mode', {
    hint: 'Install bull (npm install bull) and ensure Redis is accessible via REDIS_URL',
    error: error.message,
  });
}

const DEFAULT_CONCURRENCY = Math.max(1, Math.floor(os.cpus().length / 2));

const queues = new Map();

const buildQueueKey = (name, redisUrl) => `${name}:${redisUrl}`;

const createStubQueue = (name) => {
  const stubClient = {
    status: 'stub',
    async ping() {
      throw new Error('Redis client not configured');
    },
  };

  return {
    name,
    process: () => {
      logger.warn('Skipping queue processor registration; Bull not available', { queue: name });
    },
    add: async () => {
      logger.warn('Skipping queue add; Bull not available', { queue: name });
      return { id: `${name}-noop` };
    },
    pause: async () => {
      logger.warn('Skipping queue pause; Bull not available', { queue: name });
    },
    resume: async () => {
      logger.warn('Skipping queue resume; Bull not available', { queue: name });
    },
    clean: async () => {
      logger.warn('Skipping queue clean; Bull not available', { queue: name });
    },
    getFailed: async () => [],
    getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }),
    getRepeatableJobs: async () => [],
    isPaused: async () => true,
    client: stubClient,
    clients: [stubClient],
    close: async () => {},
  };
};

const getQueue = ({ name, redisUrl, settings = {} }) => {
  const key = buildQueueKey(name, redisUrl);

  if (queues.has(key)) {
    return queues.get(key);
  }

  if (!Bull) {
    const stub = createStubQueue(name);
    queues.set(key, stub);
    return stub;
  }

  const queue = new Bull(name, redisUrl, {
    settings: {
      stalledInterval: 30000,
      maxStalledCount: 1,
      ...settings,
    },
  });

  queue.on('error', (error) => {
    logger.error('Queue error', { queue: name, error: error.message });
  });

  queue.on('stalled', (job) => {
    logger.warn('Queue job stalled', { queue: name, jobId: job.id });
  });

  queue.on('completed', (job, result) => {
    logger.info('Queue job completed', {
      queue: name,
      jobId: job.id,
      result,
    });
  });

  queue.on('failed', (job, error) => {
    logger.error('Queue job failed', {
      queue: name,
      jobId: job?.id,
      error: error.message,
    });
  });

  queues.set(key, queue);
  return queue;
};

const closeAllQueues = async () => {
  await Promise.all(
    Array.from(queues.values()).map(async (queue) => {
      try {
        await queue.close();
      } catch (error) {
        logger.error('Failed to close queue', { queue: queue.name, error: error.message });
      }
    })
  );
  queues.clear();
};

module.exports = {
  getQueue,
  closeAllQueues,
  DEFAULT_CONCURRENCY,
  queueAvailable: Boolean(Bull),
};
