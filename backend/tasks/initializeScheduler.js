const { initializeQueues } = require('../queues');
const logger = require('../middleware/logger');

let initialized = false;

const initializeScheduler = async () => {
  if (initialized) {
    logger.info('Scheduler already initialized');
    return;
  }

  try {
    await initializeQueues();
    initialized = true;
    logger.info('✅ Bull queue scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize scheduler queues', { error: error.message });
    throw error;
  }
};

module.exports = initializeScheduler;
