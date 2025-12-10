const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const CDR = require('../models/CDR');
const StripeTransaction = require('../models/StripeTransaction');
const { pool } = require('../config/database');
const logger = require('../middleware/logger');

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const parsePeriod = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPeriodRange = (periodDays) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * MS_IN_DAY);
  return { startDate, endDate };
};

const fetchAllCustomers = async () => {
  const result = await Customer.getAll(1, 10000);
  return result.customers || [];
};

const roundNumber = (value, precision = 4) => {
  return parseFloat(Number(value || 0).toFixed(precision));
};

const buildDashboardOverviewData = async (periodDays) => {
  const { startDate, endDate } = getPeriodRange(periodDays);
  const customers = await fetchAllCustomers();

  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const inactiveCustomers = customers.filter((c) => c.status === 'inactive').length;
  const totalBalance = customers.reduce((sum, c) => sum + parseFloat(c.current_balance || 0), 0);

  const totalsByCurrency = {};
  let invoiceCount = 0;
  let totalCalls = 0;
  let totalDuration = 0;
  let totalCharges = 0;

  for (const customer of customers) {
    const invoicesResult = await Invoice.getByCustomer(customer.id, 1, 10000);
    const periodInvoices = invoicesResult.invoices.filter((inv) => {
      const createdAt = new Date(inv.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });

    periodInvoices.forEach((inv) => {
      const currency = inv.currency || customer.currency || 'USD';
      totalsByCurrency[currency] = totalsByCurrency[currency] || {
        invoiced: 0,
        paid: 0,
      };

      totalsByCurrency[currency].invoiced += parseFloat(inv.total_amount || 0);
      totalsByCurrency[currency].paid += parseFloat(inv.amount_paid || 0);
      invoiceCount += 1;
    });

    const cdrsResult = await CDR.getByCustomer(customer.id, {
      start_date: startDate,
      end_date: endDate,
      page: 1,
      limit: 10000,
    });

    totalCalls += cdrsResult.cdrs.length;
    totalDuration += cdrsResult.cdrs.reduce((sum, cdr) => sum + (cdr.duration_seconds || 0), 0);
    totalCharges += cdrsResult.cdrs.reduce(
      (sum, cdr) => sum + parseFloat(cdr.billable_amount || 0),
      0
    );
  }

  const financialsByCurrency = Object.entries(totalsByCurrency).map(([currency, values]) => ({
    currency,
    total_invoiced: roundNumber(values.invoiced),
    total_paid: roundNumber(values.paid),
    outstanding: roundNumber(values.invoiced - values.paid),
  }));

  const aggregateFinancials = financialsByCurrency.reduce(
    (acc, item) => {
      acc.total_invoiced += item.total_invoiced;
      acc.total_paid += item.total_paid;
      acc.outstanding += item.outstanding;
      return acc;
    },
    { total_invoiced: 0, total_paid: 0, outstanding: 0 }
  );

  return {
    period: {
      start_date: startDate,
      end_date: endDate,
      days: periodDays,
    },
    customers: {
      total: customers.length,
      active: activeCustomers,
      inactive: inactiveCustomers,
    },
    financials: {
      total_invoiced: roundNumber(aggregateFinancials.total_invoiced),
      total_paid: roundNumber(aggregateFinancials.total_paid),
      outstanding: roundNumber(aggregateFinancials.outstanding),
      total_customer_balance: roundNumber(totalBalance),
      invoice_count: invoiceCount,
      by_currency: financialsByCurrency,
    },
    usage: {
      total_calls: totalCalls,
      total_duration_seconds: totalDuration,
      average_call_duration: Math.round(totalDuration / (totalCalls || 1)),
      total_charged: roundNumber(totalCharges),
    },
  };
};

const buildCustomerAnalyticsData = async () => {
  const customers = await fetchAllCustomers();

  const analytics = {
    total_customers: customers.length,
    by_status: {
      active: 0,
      inactive: 0,
      suspended: 0,
    },
    by_currency: {},
    by_country: {},
    balance_distribution: {
      over_500: 0,
      over_100: 0,
      over_50: 0,
      over_10: 0,
      under_10: 0,
    },
  };

  customers.forEach((customer) => {
    const statusKey = customer.status || 'unknown';
    analytics.by_status[statusKey] = (analytics.by_status[statusKey] || 0) + 1;

    const currencyKey = customer.currency || 'USD';
    if (!analytics.by_currency[currencyKey]) {
      analytics.by_currency[currencyKey] = {
        count: 0,
        total_balance: 0,
      };
    }
    analytics.by_currency[currencyKey].count += 1;
    analytics.by_currency[currencyKey].total_balance += parseFloat(customer.current_balance || 0);

    const countryKey = customer.country || 'Unknown';
    analytics.by_country[countryKey] = (analytics.by_country[countryKey] || 0) + 1;

    const balance = parseFloat(customer.current_balance || 0);
    if (balance >= 500) analytics.balance_distribution.over_500 += 1;
    else if (balance >= 100) analytics.balance_distribution.over_100 += 1;
    else if (balance >= 50) analytics.balance_distribution.over_50 += 1;
    else if (balance >= 10) analytics.balance_distribution.over_10 += 1;
    else analytics.balance_distribution.under_10 += 1;
  });

  Object.keys(analytics.by_currency).forEach((currency) => {
    analytics.by_currency[currency].total_balance = roundNumber(
      analytics.by_currency[currency].total_balance
    );
  });

  return analytics;
};

const buildRevenueReportData = async (periodDays) => {
  const { startDate, endDate } = getPeriodRange(periodDays);
  const customers = await fetchAllCustomers();

  let totalRevenue = 0;
  let totalCalls = 0;
  const revenueByDay = {};
  const revenueByCustomer = [];
  const revenueByCurrency = {};

  for (const customer of customers) {
    const invoicesResult = await Invoice.getByCustomer(customer.id, 1, 10000);
    const periodInvoices = invoicesResult.invoices.filter((inv) => {
      const createdAt = new Date(inv.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const customerRevenueBreakdown = periodInvoices.reduce(
      (acc, inv) => {
        const currency = inv.currency || customer.currency || 'USD';
        const amount = parseFloat(inv.total_amount || 0);
        acc.total += amount;
        acc.byCurrency[currency] = (acc.byCurrency[currency] || 0) + amount;
        revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + amount;
        return acc;
      },
      { total: 0, byCurrency: {} }
    );
    totalRevenue += customerRevenueBreakdown.total;

    periodInvoices.forEach((inv) => {
      const day = new Date(inv.created_at).toISOString().split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + parseFloat(inv.total_amount || 0);
    });

    const cdrsResult = await CDR.getByCustomer(customer.id, {
      start_date: startDate,
      end_date: endDate,
      page: 1,
      limit: 10000,
    });
    const callCount = cdrsResult.cdrs.length;
    totalCalls += callCount;

    if (customerRevenueBreakdown.total > 0) {
      revenueByCustomer.push({
        customer_id: customer.id,
        customer_name: customer.name,
        email: customer.email,
        revenue: roundNumber(customerRevenueBreakdown.total),
        revenue_by_currency: Object.entries(customerRevenueBreakdown.byCurrency).map(([currency, amount]) => ({
          currency,
          total: roundNumber(amount),
        })),
        invoices: periodInvoices.length,
        calls: callCount,
      });
    }
  }

  revenueByCustomer.sort((a, b) => b.revenue - a.revenue);

  const revenueByDayArray = Object.keys(revenueByDay)
    .sort()
    .map((day) => ({
      date: day,
      revenue: roundNumber(revenueByDay[day]),
    }));

  return {
    period: {
      start_date: startDate,
      end_date: endDate,
      days: periodDays,
    },
    summary: {
      total_revenue: roundNumber(totalRevenue),
      total_calls: totalCalls,
      average_revenue_per_call: roundNumber(totalRevenue / (totalCalls || 1)),
      average_revenue_per_day: roundNumber(totalRevenue / (periodDays || 1)),
      by_currency: Object.entries(revenueByCurrency).map(([currency, amount]) => ({
        currency,
        total_revenue: roundNumber(amount),
      })),
    },
    revenue_by_day: revenueByDayArray,
    top_customers: revenueByCustomer.slice(0, 10),
  };
};

const buildPaymentAnalyticsData = async (periodDays) => {
  const { startDate, endDate } = getPeriodRange(periodDays);
  const customers = await fetchAllCustomers();

  const analytics = {
    total_transactions: 0,
    succeeded: 0,
    failed: 0,
    pending: 0,
    total_amount: 0,
    succeeded_amount: 0,
    failed_amount: 0,
    by_status: {},
    failed_reasons: {},
  };

  for (const customer of customers) {
    const transactionsResult = await StripeTransaction.getByCustomer(customer.id, 1, 10000);
    const periodTransactions = transactionsResult.transactions.filter((t) => {
      const createdAt = new Date(t.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });

    periodTransactions.forEach((transaction) => {
      analytics.total_transactions += 1;
      const amount = parseFloat(transaction.amount || 0);
      analytics.total_amount += amount;

      const statusKey = transaction.status || 'unknown';
      analytics.by_status[statusKey] = (analytics.by_status[statusKey] || 0) + 1;

      if (transaction.status === 'succeeded') {
        analytics.succeeded += 1;
        analytics.succeeded_amount += amount;
      } else if (transaction.status === 'failed') {
        analytics.failed += 1;
        analytics.failed_amount += amount;

        if (transaction.error_message) {
          analytics.failed_reasons[transaction.error_message] =
            (analytics.failed_reasons[transaction.error_message] || 0) + 1;
        }
      } else {
        analytics.pending += 1;
      }
    });
  }

  const totalAttempts = analytics.succeeded + analytics.failed;
  const successRate = totalAttempts > 0 ? (analytics.succeeded / totalAttempts) * 100 : 0;

  return {
    period: {
      start_date: startDate,
      end_date: endDate,
      days: periodDays,
    },
    summary: {
      total_transactions: analytics.total_transactions,
      total_amount: roundNumber(analytics.total_amount),
      success_rate: parseFloat(successRate.toFixed(2)),
    },
    breakdown: {
      succeeded: {
        count: analytics.succeeded,
        amount: roundNumber(analytics.succeeded_amount),
      },
      failed: {
        count: analytics.failed,
        amount: roundNumber(analytics.failed_amount),
      },
      pending: analytics.pending,
    },
    by_status: analytics.by_status,
    failure_analysis: analytics.failed_reasons,
  };
};

const buildUsageAnalyticsData = async (periodDays) => {
  const { startDate, endDate } = getPeriodRange(periodDays);
  const customers = await fetchAllCustomers();

  const analytics = {
    total_calls: 0,
    total_duration_seconds: 0,
    total_billed_amount: 0,
    calls_by_service_type: {
      DID: 0,
      VIRTUAL_NUMBER: 0,
    },
    calls_by_country: {},
    top_customers: [],
  };

  for (const customer of customers) {
    const cdrsResult = await CDR.getByCustomer(customer.id, {
      start_date: startDate,
      end_date: endDate,
      page: 1,
      limit: 10000,
    });

    const cdrs = cdrsResult.cdrs;
    const callCount = cdrs.length;
    const duration = cdrs.reduce((sum, cdr) => sum + (cdr.duration_seconds || 0), 0);
    const billed = cdrs.reduce((sum, cdr) => sum + parseFloat(cdr.billable_amount || 0), 0);

    analytics.total_calls += callCount;
    analytics.total_duration_seconds += duration;
    analytics.total_billed_amount += billed;

    cdrs.forEach((cdr) => {
      if (cdr.service_type === 'DID') analytics.calls_by_service_type.DID += 1;
      else if (cdr.service_type === 'VIRTUAL_NUMBER') analytics.calls_by_service_type.VIRTUAL_NUMBER += 1;
    });

    const countryKey = customer.country || 'Unknown';
    analytics.calls_by_country[countryKey] = (analytics.calls_by_country[countryKey] || 0) + callCount;

    if (callCount > 0) {
      analytics.top_customers.push({
        customer_id: customer.id,
        customer_name: customer.name,
        calls: callCount,
        duration_seconds: duration,
        billed_amount: roundNumber(billed),
      });
    }
  }

  analytics.top_customers.sort((a, b) => b.calls - a.calls);
  analytics.top_customers = analytics.top_customers.slice(0, 10);

  return {
    period: {
      start_date: startDate,
      end_date: endDate,
      days: periodDays,
    },
    summary: {
      total_calls: analytics.total_calls,
      total_duration_seconds: analytics.total_duration_seconds,
      average_call_duration: Math.round(
        analytics.total_duration_seconds / (analytics.total_calls || 1)
      ),
      total_billed: roundNumber(analytics.total_billed_amount),
      average_charge_per_call: roundNumber(
        analytics.total_billed_amount / (analytics.total_calls || 1)
      ),
    },
    calls_by_service_type: analytics.calls_by_service_type,
    calls_by_country: analytics.calls_by_country,
    top_customers: analytics.top_customers,
  };
};

const buildInvoiceStatusReportData = async () => {
  const customers = await fetchAllCustomers();

  const report = {
    total_invoices: 0,
    by_status: {
      draft: 0,
      issued: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    },
    amounts_by_status: {
      draft: 0,
      issued: 0,
      paid: 0,
      overdue: 0,
    },
    overdue_details: [],
  };

  const today = new Date();

  for (const customer of customers) {
    const invoicesResult = await Invoice.getByCustomer(customer.id, 1, 10000);
    const invoices = invoicesResult.invoices;

    invoices.forEach((inv) => {
      const statusKey = inv.status || 'draft';
      report.total_invoices += 1;
      report.by_status[statusKey] = (report.by_status[statusKey] || 0) + 1;

      const amount = parseFloat(inv.total_amount || 0);
      if (
        statusKey === 'overdue' ||
        (statusKey === 'issued' && inv.due_date && new Date(inv.due_date) < today)
      ) {
        report.amounts_by_status.overdue += amount;
        const daysOverdue = Math.floor((today - new Date(inv.due_date)) / MS_IN_DAY);
        report.overdue_details.push({
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          customer_id: customer.id,
          customer_name: customer.name,
          amount: roundNumber(amount),
          due_date: inv.due_date,
          days_overdue: daysOverdue,
        });
      } else if (report.amounts_by_status[statusKey] !== undefined) {
        report.amounts_by_status[statusKey] += amount;
      }
    });
  }

  report.overdue_details.sort((a, b) => b.days_overdue - a.days_overdue);

  Object.keys(report.amounts_by_status).forEach((key) => {
    report.amounts_by_status[key] = roundNumber(report.amounts_by_status[key]);
  });

  return report;
};

const buildSystemHealthData = async () => {
  const dbStart = Date.now();
  await pool.query('SELECT NOW()');
  const dbLatency = Date.now() - dbStart;

  const customersResult = await Customer.getAll(1, 10000);
  const logsResult = await pool.query(
    "SELECT COUNT(*) FROM system_logs WHERE created_at > NOW() - INTERVAL '1 hour'"
  );

  const health = {
    status: 'healthy',
    timestamp: new Date(),
    components: {
      database: {
        status: 'connected',
        latency_ms: dbLatency,
      },
      api: {
        status: 'operational',
      },
    },
    stats: {
      total_customers: customersResult.total,
      logs_last_hour: parseInt(logsResult.rows[0].count, 10),
    },
  };

  if (dbLatency > 1000) {
    health.components.database.status = 'slow';
    health.status = 'degraded';
  }

  return health;
};

exports.getDashboardOverview = async (req, res) => {
  try {
    const periodDays = parsePeriod(req.query.period, 30);
    const data = await buildDashboardOverviewData(periodDays);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to get dashboard overview', { error: error.message });
    res.status(500).json({
      error: 'Failed to get dashboard overview',
      details: error.message,
    });
  }
};

exports.getCustomerAnalytics = async (req, res) => {
  try {
    const data = await buildCustomerAnalyticsData();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to get customer analytics', { error: error.message });
    res.status(500).json({
      error: 'Failed to get customer analytics',
      details: error.message,
    });
  }
};

exports.getRevenueReport = async (req, res) => {
  try {
    const periodDays = parsePeriod(req.query.period, 90);
    const data = await buildRevenueReportData(periodDays);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to get revenue report', { error: error.message });
    res.status(500).json({
      error: 'Failed to get revenue report',
      details: error.message,
    });
  }
};

exports.getPaymentAnalytics = async (req, res) => {
  try {
    const periodDays = parsePeriod(req.query.period, 30);
    const data = await buildPaymentAnalyticsData(periodDays);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to get payment analytics', { error: error.message });
    res.status(500).json({
      error: 'Failed to get payment analytics',
      details: error.message,
    });
  }
};

exports.getUsageAnalytics = async (req, res) => {
  try {
    const periodDays = parsePeriod(req.query.period, 30);
    const data = await buildUsageAnalyticsData(periodDays);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to get usage analytics', { error: error.message });
    res.status(500).json({
      error: 'Failed to get usage analytics',
      details: error.message,
    });
  }
};

exports.getInvoiceStatusReport = async (req, res) => {
  try {
    const data = await buildInvoiceStatusReportData();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to get invoice status report', { error: error.message });
    res.status(500).json({
      error: 'Failed to get invoice status report',
      details: error.message,
    });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    const data = await buildSystemHealthData();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to get system health', { error: error.message });
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
};

exports.getSystemLogs = async (req, res) => {
  try {
    const level = req.query.level;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = (page - 1) * limit;

    let queryText = 'SELECT * FROM system_logs';
    const params = [];

    if (level) {
      queryText += ' WHERE level = $1';
      params.push(level);
    }

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    queryText += ` ORDER BY created_at DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
    params.push(limit, offset);

    const result = await pool.query(queryText, params);

    const countQuery = `SELECT COUNT(*) FROM system_logs${level ? ' WHERE level = $1' : ''}`;
    const countParams = level ? [level] : [];
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count, 10),
      },
    });
  } catch (error) {
    logger.error('Failed to get system logs', { error: error.message });
    res.status(500).json({
      error: 'Failed to get system logs',
      details: error.message,
    });
  }
};

exports.exportReport = async (req, res) => {
  try {
    const { report_type = 'overview', period = '30' } = req.query;
    const periodDays = parsePeriod(period, 30);

    let data;

    switch (report_type) {
      case 'revenue':
        data = await buildRevenueReportData(periodDays);
        break;
      case 'payments':
        data = await buildPaymentAnalyticsData(periodDays);
        break;
      case 'usage':
        data = await buildUsageAnalyticsData(periodDays);
        break;
      default:
        data = await buildDashboardOverviewData(periodDays);
    }

    const payload = {
      success: true,
      data,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${report_type}-${Date.now()}.json"`
    );

    res.json(payload);
  } catch (error) {
    logger.error('Failed to export report', { error: error.message });
    res.status(500).json({
      error: 'Failed to export report',
      details: error.message,
    });
  }
};
