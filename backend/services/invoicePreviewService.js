const CDR = require('../models/CDR');

/**
 * Calculate usage totals for invoice preview.
 */
exports.getUsagePreview = async ({ customerId, startDate, endDate }) => {
  if (!customerId || !startDate || !endDate) {
    return {
      cdrCount: 0,
      totalSeconds: 0,
      usageCharges: 0,
    };
  }

  const cdrs = await CDR.getForInvoicePeriod(customerId, startDate, endDate);

  let totalSeconds = 0;
  let usageCharges = 0;

  cdrs.forEach((cdr) => {
    totalSeconds += Number(cdr.billable_seconds || 0);
    usageCharges += Number(cdr.billable_amount || 0);
  });

  return {
    cdrCount: cdrs.length,
    totalSeconds,
    usageCharges: Number(usageCharges.toFixed(4)),
    usageChargesByCurrency: cdrs.reduce((acc, cdr) => {
      const currency = cdr.currency || cdr.customer_currency || 'USD';
      acc[currency] = (acc[currency] || 0) + Number(cdr.billable_amount || 0);
      return acc;
    }, {}),
  };
};
