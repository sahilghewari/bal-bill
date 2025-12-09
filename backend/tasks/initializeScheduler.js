const { scheduleJob, getScheduledJobs } = require('../config/scheduler');
const billingTasks = require('./billingTasks');
const logger = require('../middleware/logger');

const initializeScheduler = () => {
  logger.info('🕐 Initializing billing scheduler...');
  try {
    scheduleJob('process-pending-cdrs', 'hourly', billingTasks.processPendingCDRs);
    scheduleJob('generate-due-invoices', 'daily', billingTasks.generateDueInvoices);
    scheduleJob('check-low-balances', '360', billingTasks.checkLowBalances);
    scheduleJob('retry-failed-payments', '720', billingTasks.retryFailedPayments);
    scheduleJob('send-invoice-reminders', 'daily', billingTasks.sendInvoiceReminders);
    scheduleJob('health-check', '30', billingTasks.healthCheck);
    scheduleJob('cleanup-old-logs', 'weekly', billingTasks.cleanupOldLogs);
    scheduleJob('generate-reports', 'daily', billingTasks.generateReports);

    logger.info('✅ Scheduler initialized successfully');
    logger.info('Scheduled jobs snapshot', getScheduledJobs());
  } catch (error) {
    logger.error('Failed to initialize scheduler', { error: error.message });
    throw error;
  }
};

module.exports = initializeScheduler;
