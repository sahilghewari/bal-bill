const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const CDR = require('../models/CDR');
const RatingEngine = require('../utils/ratingEngine');
const BalanceManager = require('../utils/balanceManager');
const StripeTransaction = require('../models/StripeTransaction');
const stripe = require('../config/stripe');
const logger = require('../middleware/logger');
const { pool } = require('../config/database');
const { defaultService: notificationService } = require('../notifications');

exports.generateDueInvoices = async () => {
  try {
    logger.info('Starting invoice generation task');
    const { customers } = await Customer.getAll(1, 10000);
    const today = new Date();
    const billingDay = today.getDate();
    let generatedCount = 0;
    let failedCount = 0;

    for (const customer of customers.filter((c) => c.status === 'active')) {
      if (customer.billing_day !== billingDay) continue;

      try {
        const billingStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const billingEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const cdrs = await CDR.getForInvoicePeriod(customer.id, billingStart, billingEnd);

        const invoiceRequest = {
          billing_period_start: billingStart,
          billing_period_end: billingEnd,
          due_date: dueDate,
          usage_charges: 0,
          tax_rate: typeof customer.default_tax_rate === 'number' ? customer.default_tax_rate : 0,
          discount_amount: 0,
          notes: 'Automated billing cycle invoice',
          auto_publish: true,
          line_items: [],
        };

        const invoicePayload = Invoice.prepareInvoicePayload({
          customer,
          invoiceRequest,
          cdrs,
          manualLineItems: invoiceRequest.line_items,
          usageCharges: invoiceRequest.usage_charges,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd,
          dueDate,
        });

        if (!invoicePayload) {
          continue;
        }

        const { invoice } = await Invoice.createWithLineItems(invoicePayload);

        generatedCount += 1;
        logger.info('Invoice generated automatically', {
          invoice_id: invoice.id,
          customer_id: customer.id,
        });
      } catch (error) {
        failedCount += 1;
        logger.error('Failed to generate invoice during scheduler run', {
          customer_id: customer.id,
          error: error.message,
        });
      }
    }

    logger.info('Invoice generation task completed', { generated: generatedCount, failed: failedCount });
  } catch (error) {
    logger.error('Invoice generation task error', { error: error.message });
  }
};

exports.processPendingCDRs = async () => {
  try {
    logger.info('Starting CDR processing task');
    const { customers } = await Customer.getAll(1, 10000);
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const customer of customers.filter((c) => c.status === 'active')) {
      try {
        const result = await RatingEngine.processCustomerCDRs(customer.id);
        processed += result.processed;
        failed += result.failed;
        skipped += result.skipped;
      } catch (error) {
        logger.error('Failed to process CDRs for customer', {
          customer_id: customer.id,
          error: error.message,
        });
      }
    }

    logger.info('CDR processing task completed', { processed, failed, skipped });
  } catch (error) {
    logger.error('CDR processing task error', { error: error.message });
  }
};

exports.checkLowBalances = async () => {
  try {
    logger.info('Starting low balance check task');
    const { customers } = await Customer.getAll(1, 10000);
    const lowThreshold = 50;
    const criticalThreshold = 10;
    let lowCount = 0;
    let criticalCount = 0;

    for (const customer of customers.filter((c) => c.status === 'active')) {
      const balance = parseFloat(customer.current_balance || 0);
      if (balance < criticalThreshold) {
        criticalCount += 1;
        logger.warn('Critical balance alert', { customer_id: customer.id, balance });
        await notificationService.send('customer.balance.critical', {
          customer_id: customer.id,
          balance,
          threshold: criticalThreshold,
        });
      } else if (balance < lowThreshold) {
        lowCount += 1;
        logger.info('Low balance alert', { customer_id: customer.id, balance });
        await notificationService.send('customer.balance.low', {
          customer_id: customer.id,
          balance,
          threshold: lowThreshold,
        });
      }
    }

    logger.info('Low balance task completed', { low_balance_count: lowCount, critical_balance_count: criticalCount });
  } catch (error) {
    logger.error('Low balance check error', { error: error.message });
  }
};

exports.retryFailedPayments = async () => {
  try {
    logger.info('Starting failed payment retry task');
    const failedTransactions = await StripeTransaction.getFailedForRetry();
    if (!failedTransactions.length) {
      logger.info('No failed payments to retry');
      return;
    }

    let retried = 0;
    let succeeded = 0;
    let stillFailed = 0;

    for (const transaction of failedTransactions) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id);
        retried += 1;

        if (paymentIntent.status === 'requires_payment_method') {
          await StripeTransaction.updateStatus(transaction.id, 'requires_payment_method', 'Missing payment method for retry');
          stillFailed += 1;
          continue;
        }

        if (paymentIntent.status === 'succeeded') {
          succeeded += 1;
          await StripeTransaction.updateStatus(transaction.id, 'succeeded');
          continue;
        }

        if ((transaction.retry_count || 0) < 3) {
          const nextRetryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await StripeTransaction.setRetry(transaction.id, (transaction.retry_count || 0) + 1, nextRetryTime);
        } else {
          await StripeTransaction.updateStatus(transaction.id, 'failed', 'Max retries reached');
          stillFailed += 1;
        }
      } catch (error) {
        stillFailed += 1;
        logger.error('Failed to retry transaction', { transaction_id: transaction.id, error: error.message });
      }
    }

    logger.info('Failed payment retry task completed', { total_checked: failedTransactions.length, retried, succeeded, still_failed: stillFailed });
  } catch (error) {
    logger.error('Failed payment retry task error', { error: error.message });
  }
};

exports.sendInvoiceReminders = async () => {
  try {
    logger.info('Starting invoice reminder task');
    const { customers } = await Customer.getAll(1, 10000);
    const today = new Date();
    let remindersSent = 0;

    for (const customer of customers) {
      const invoicesResult = await Invoice.getByCustomer(customer.id, 1, 10000);
      for (const invoice of invoicesResult.invoices) {
        const dueDate = new Date(invoice.due_date);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if ((daysUntilDue === 1 && invoice.status === 'issued') || (daysUntilDue < 0 && invoice.status === 'issued')) {
          remindersSent += 1;
          logger.info('Invoice reminder triggered', {
            invoice_id: invoice.id,
            customer_id: customer.id,
            days_until_due: daysUntilDue,
          });
          await notificationService.send('invoice.reminder', {
            invoice_id: invoice.id,
            customer_id: customer.id,
            due_date: invoice.due_date,
            days_until_due: daysUntilDue,
          });
        }
      }
    }

    logger.info('Invoice reminder task completed', { reminders_sent: remindersSent });
  } catch (error) {
    logger.error('Invoice reminder task error', { error: error.message });
  }
};

exports.markOverdueInvoices = async () => {
  try {
    logger.info('Starting overdue invoice check');
    const marked = await Invoice.markOverduePastDueDate();
    logger.info('Overdue invoice check complete', { marked: marked.length });

    if (marked.length) {
      await Promise.allSettled(
        marked.map(async (invoice) => {
          try {
            const customer = await Customer.getById(invoice.customer_id);
            logger.info('Invoice moved to overdue', {
              invoice_id: invoice.id,
              customer_id: invoice.customer_id,
              customer_email: customer?.email,
              due_date: invoice.due_date,
              total_amount: invoice.total_amount,
            });
            await notificationService.send('invoice.overdue', {
              invoice_id: invoice.id,
              customer_id: invoice.customer_id,
              customer_email: customer?.email || null,
              due_date: invoice.due_date,
              total_amount: invoice.total_amount,
            });
          } catch (notifyError) {
            logger.warn('Failed to enrich overdue notification context', {
              invoice_id: invoice.id,
              error: notifyError.message,
            });
          }
        })
      );
    }
  } catch (error) {
    logger.error('Failed to mark overdue invoices', { error: error.message });
  }
};

exports.autoCancelStaleOverdueInvoices = async () => {
  try {
    logger.info('Starting auto-cancel check for stale overdue invoices');
    const cancelled = await Invoice.markCancelledBySystem();

    if (cancelled.length) {
      await Promise.allSettled(
        cancelled.map(async (invoice) => {
          try {
            const customer = await Customer.getById(invoice.customer_id);
            logger.warn('Invoice auto-cancelled after grace period', {
              invoice_id: invoice.id,
              customer_id: invoice.customer_id,
              customer_email: customer?.email,
              due_date: invoice.due_date,
              total_amount: invoice.total_amount,
              cancellation_reason: invoice.cancellation_reason,
            });
            await notificationService.send('invoice.cancelled.auto', {
              invoice_id: invoice.id,
              customer_id: invoice.customer_id,
              customer_email: customer?.email || null,
              due_date: invoice.due_date,
              total_amount: invoice.total_amount,
              cancellation_reason: invoice.cancellation_reason,
            });
          } catch (notifyError) {
            logger.warn('Failed to enrich auto-cancel notification context', {
              invoice_id: invoice.id,
              error: notifyError.message,
            });
          }
        })
      );
    }

    logger.info('Auto-cancel check complete', { cancelled: cancelled.length });
  } catch (error) {
    logger.error('Failed to auto-cancel stale overdue invoices', { error: error.message });
  }
};

exports.healthCheck = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.debug('Health check passed', { timestamp: result.rows[0].now });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
  }
};

exports.cleanupOldLogs = async () => {
  try {
    logger.info('Starting log cleanup task');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await pool.query('DELETE FROM system_logs WHERE created_at < $1', [thirtyDaysAgo]);
    logger.info('Log cleanup completed', { rows_deleted: result.rowCount });
  } catch (error) {
    logger.error('Log cleanup task error', { error: error.message });
  }
};

exports.generateReports = async () => {
  try {
    logger.info('Starting report generation task');
    const customersResult = await Customer.getAll(1, 10000);
    const totalCustomers = customersResult.total;
    const sampleCustomer = customersResult.customers[0];
    let totalInvoices = 0;

    if (sampleCustomer) {
      const invoicesResult = await Invoice.getByCustomer(sampleCustomer.id, 1, 10000);
      totalInvoices = invoicesResult.total;
    }

    logger.info('Report generated', {
      generated_at: new Date().toISOString(),
      total_customers: totalCustomers,
      total_invoices: totalInvoices,
    });
  } catch (error) {
    logger.error('Report generation error', { error: error.message });
  }
};
