const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

router.get('/queues', schedulerController.listQueues);
router.get('/queues/health', schedulerController.getHealth);
router.post('/queues/:queue_key/jobs/:job_name', schedulerController.triggerJob);
router.post('/queues/:queue_key/pause', schedulerController.pauseQueue);
router.post('/queues/:queue_key/resume', schedulerController.resumeQueue);
router.post('/queues/:queue_key/clean', schedulerController.cleanQueue);
router.post('/queues/:queue_key/retry-failed', schedulerController.retryFailedJobs);

module.exports = router;
