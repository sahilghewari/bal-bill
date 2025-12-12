const billingTasks = require('../../tasks/billingTasks');
const logger = require('../../middleware/logger');

module.exports = async (job) => {
  const { name } = job;

  try {
    switch (name) {
      case 'process-pending-cdrs':
        await billingTasks.processPendingCDRs();
        break;
      case 'mark-overdue-invoices':
        await billingTasks.markOverdueInvoices();
        break;
      case 'auto-cancel-invoices':
        await billingTasks.autoCancelStaleOverdueInvoices();
        break;
      case 'retry-failed-payments':
        await billingTasks.retryFailedPayments();
        break;
      case 'send-invoice-reminders':
        await billingTasks.sendInvoiceReminders();
        break;
      default:
        logger.warn('Received unknown billing job', { job: name });
        break;
    }
  } catch (error) {
    logger.error('Billing processor failed', { job: name, error: error.message });
    throw error;
  }
};
