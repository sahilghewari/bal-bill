const { getScheduledJobs, stopJob, scheduleJob } = require('../config/scheduler');
const billingTasks = require('../tasks/billingTasks');
const logger = require('../middleware/logger');

exports.getScheduledJobs = async (req, res) => {
  try {
    const jobs = getScheduledJobs();
    res.json({ success: true, data: jobs, count: jobs.length });
  } catch (error) {
    logger.error('Failed to fetch scheduled jobs', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch scheduled jobs', details: error.message });
  }
};

exports.stopJob = async (req, res) => {
  try {
    const { job_name } = req.params;
    const stopped = stopJob(job_name);
    if (!stopped) {
      return res.status(404).json({ error: `Job not found: ${job_name}` });
    }
    res.json({ success: true, message: `Job stopped: ${job_name}` });
  } catch (error) {
    logger.error('Failed to stop job', { error: error.message });
    res.status(500).json({ error: 'Failed to stop job', details: error.message });
  }
};

exports.getSchedulerStatus = async (req, res) => {
  try {
    const jobs = getScheduledJobs();
    res.json({
      success: true,
      data: {
        scheduler_running: jobs.length > 0,
        total_jobs: jobs.length,
        jobs,
      },
    });
  } catch (error) {
    logger.error('Failed to get scheduler status', { error: error.message });
    res.status(500).json({ error: 'Failed to get scheduler status', details: error.message });
  }
};
