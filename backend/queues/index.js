const { getQueue, DEFAULT_CONCURRENCY } = require('../config/scheduler');
const config = require('../config/environments');
const logger = require('../middleware/logger');

const redisUrl = config.queue.redisUrl;

const queueDefinitions = {
  billing: {
    name: 'billing-jobs',
    processor: require('./processors/billingProcessor'),
    concurrency: DEFAULT_CONCURRENCY,
    repeatable: [
      {
        name: 'process-pending-cdrs',
        every: 60 * 60 * 1000,
        jobData: {},
      },
      {
        name: 'mark-overdue-invoices',
        every: 24 * 60 * 60 * 1000,
        jobData: {},
      },
      {
        name: 'auto-cancel-invoices',
        every: 24 * 60 * 60 * 1000,
        jobData: {},
      },
      {
        name: 'retry-failed-payments',
        every: 6 * 60 * 60 * 1000,
        jobData: {},
      },
      {
        name: 'send-invoice-reminders',
        every: 24 * 60 * 60 * 1000,
        jobData: {},
      },
    ],
  },
};

const queues = {};

const initializeQueues = async () => {
  if (!config.queue.enabled) {
    logger.warn('Queue processing disabled via configuration');
    return queues;
  }

  Object.entries(queueDefinitions).forEach(([key, config]) => {
    const queue = getQueue({ name: config.name, redisUrl });

    queue.process(config.concurrency || DEFAULT_CONCURRENCY, config.processor);

    queue.on('waiting', (jobId) => {
      logger.debug('Job waiting', { queue: config.name, jobId });
    });

    config.repeatable?.forEach((job) => {
      queue.add(job.name, job.jobData || {}, {
        repeat: {
          every: job.every,
        },
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60 * 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    });

    queues[key] = queue;
  });

  return queues;
};

module.exports = {
  initializeQueues,
  queues,
};
