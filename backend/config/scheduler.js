const logger = require('../middleware/logger');

const scheduledJobs = {};

const scheduleJob = (jobName, cronPattern, task) => {
  if (scheduledJobs[jobName]) {
    logger.warn('Job already scheduled, skipping duplicate', { job_name: jobName });
    return scheduledJobs[jobName];
  }

  logger.info(`Scheduling job: ${jobName}`, { pattern: cronPattern });

  const runTask = async () => {
    try {
      logger.info(`Starting scheduled job: ${jobName}`);
      const startTime = Date.now();
      await task();
      const duration = Date.now() - startTime;
      logger.info(`Completed scheduled job: ${jobName}`, { duration_ms: duration });
    } catch (error) {
      logger.error(`Scheduled job failed: ${jobName}`, { error: error.message });
    }
  };

  let interval;
  switch (cronPattern) {
    case 'hourly':
      interval = 60 * 60 * 1000;
      break;
    case 'daily':
      interval = 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      interval = 7 * 24 * 60 * 60 * 1000;
      break;
    default: {
      const minutes = parseInt(cronPattern, 10);
      interval = Number.isFinite(minutes) ? minutes * 60 * 1000 : 60 * 1000;
    }
  }

  runTask();
  const jobId = setInterval(runTask, interval);
  scheduledJobs[jobName] = { jobId, interval, pattern: cronPattern };
  logger.info(`Job scheduled successfully: ${jobName}`);
  return scheduledJobs[jobName];
};

const stopJob = (jobName) => {
  if (scheduledJobs[jobName]) {
    clearInterval(scheduledJobs[jobName].jobId);
    delete scheduledJobs[jobName];
    logger.info(`Job stopped: ${jobName}`);
    return true;
  }
  logger.warn('Attempted to stop unknown job', { job_name: jobName });
  return false;
};

const getScheduledJobs = () =>
  Object.keys(scheduledJobs).map((name) => ({ name, pattern: scheduledJobs[name].pattern, interval: scheduledJobs[name].interval }));

module.exports = {
  scheduleJob,
  stopJob,
  getScheduledJobs,
};
