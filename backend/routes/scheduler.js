const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

router.get('/jobs', schedulerController.getScheduledJobs);
router.get('/status', schedulerController.getSchedulerStatus);
router.post('/jobs/:job_name/stop', schedulerController.stopJob);

module.exports = router;
