const logger = require('../middleware/logger');

class FakeQueue {
  constructor(name) {
    this.name = name;
  }

  async add(jobName, data) {
    logger.warn('Queue not configured; job skipped', { queue: this.name, job: jobName });
    return null;
  }
}

const getQueue = () => ({
  add: (...args) => {
    logger.warn('Queue not configured; ignoring add()', args);
  },
});

module.exports = { FakeQueue, getQueue };
