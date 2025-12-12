const { queues } = require('../queues');
const logger = require('../middleware/logger');
const { queueAvailable } = require('../config/scheduler');

const ensureQueueExists = (queueKey) => {
  const queue = queues[queueKey];
  if (!queue) {
    throw Object.assign(new Error(`Queue not found: ${queueKey}`), { status: 404 });
  }
  return queue;
};

const buildQueueSummary = async (key, queue) => {
  const [counts, repeatableJobs] = await Promise.all([
    queue.getJobCounts(),
    queue.getRepeatableJobs(),
  ]);

  return {
    key,
    name: queue.name,
    counts,
    repeatable_jobs: repeatableJobs.map((job) => ({
      id: job.id,
      name: job.name,
      every: job.every,
      next_run: job.next,
    })),
  };
};

exports.listQueues = async (req, res) => {
  try {
    const summaries = await Promise.all(
      Object.entries(queues).map(([key, queue]) => buildQueueSummary(key, queue))
    );

    res.json({ success: true, data: summaries });
  } catch (error) {
    logger.error('Failed to list queues', { error: error.message });
    res.status(error.status || 500).json({
      error: error.message,
      details: error.stack,
    });
  }
};

const getQueueClientState = async (queue) => {
  const client = queue.client || queue.clients?.[0];
  if (!client) {
    return { status: 'unknown', message: 'Queue client unavailable' };
  }

  try {
    if (typeof client.ping === 'function') {
      await client.ping();
    }
    return { status: 'connected' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};

exports.getHealth = async (req, res) => {
  try {
    const queueSummaries = await Promise.all(
      Object.entries(queues).map(async ([key, queue]) => {
        const counts = await queue.getJobCounts();
        const paused = typeof queue.isPaused === 'function' ? await queue.isPaused() : false;
        const clientState = await getQueueClientState(queue);

        return {
          key,
          name: queue.name,
          counts,
          paused,
          client: clientState,
          repeatable_jobs: await queue.getRepeatableJobs().then((jobs) =>
            jobs.map((job) => ({
              id: job.id,
              name: job.name,
              every: job.every,
              next_run: job.next,
            }))
          ),
        };
      })
    );

    res.json({
      success: true,
      queue_available: queueAvailable,
      queues: queueSummaries,
    });
  } catch (error) {
    logger.error('Failed to fetch queue health', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue health',
      details: error.message,
    });
  }
};

exports.triggerJob = async (req, res) => {
  try {
    const { queue_key: queueKey, job_name: jobName } = req.params;
    const queue = ensureQueueExists(queueKey);

    const job = await queue.add(jobName, { manualTrigger: true }, {
      attempts: 1,
      removeOnComplete: true,
    });

    res.json({
      success: true,
      message: `Job enqueued: ${jobName}`,
      data: { jobId: job.id },
    });
  } catch (error) {
    logger.error('Failed to trigger job', { error: error.message });
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.pauseQueue = async (req, res) => {
  try {
    const queue = ensureQueueExists(req.params.queue_key);
    await queue.pause();
    res.json({ success: true, message: `Queue paused: ${queue.name}` });
  } catch (error) {
    logger.error('Failed to pause queue', { error: error.message });
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.resumeQueue = async (req, res) => {
  try {
    const queue = ensureQueueExists(req.params.queue_key);
    await queue.resume();
    res.json({ success: true, message: `Queue resumed: ${queue.name}` });
  } catch (error) {
    logger.error('Failed to resume queue', { error: error.message });
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.cleanQueue = async (req, res) => {
  try {
    const queue = ensureQueueExists(req.params.queue_key);
    const graceMs = (parseInt(req.body?.grace_hours, 10) || 24) * 60 * 60 * 1000;

    await Promise.all([
      queue.clean(graceMs, 'completed'),
      queue.clean(graceMs, 'failed'),
    ]);

    res.json({ success: true, message: `Queue cleaned: ${queue.name}` });
  } catch (error) {
    logger.error('Failed to clean queue', { error: error.message });
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.retryFailedJobs = async (req, res) => {
  try {
    const queue = ensureQueueExists(req.params.queue_key);
    const failedJobs = await queue.getFailed();

    await Promise.all(
      failedJobs.map(async (job) => {
        await job.retry();
      })
    );

    res.json({ success: true, retried: failedJobs.length });
  } catch (error) {
    logger.error('Failed to retry failed jobs', { error: error.message });
    res.status(error.status || 500).json({ error: error.message });
  }
};
