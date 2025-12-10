const Invoice = require('../models/Invoice');
const CDR = require('../models/CDR');
const Customer = require('../models/Customer');
const CustomerBalance = require('../models/CustomerBalance');
const RatingEngine = require('../utils/ratingEngine');
const logger = require('../middleware/logger');

const parseCancellationBody = (body) => {
  if (!body || typeof body !== 'object') return {};
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
  return { reason: reason || null };
};

// Generate invoice for customer
exports.generateInvoice = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const invoiceRequest = req.body || {};

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!invoiceRequest.billing_period_start || !invoiceRequest.billing_period_end) {
      return res.status(400).json({
        error: 'billing_period_start and billing_period_end are required',
      });
    }

    const startDate = new Date(invoiceRequest.billing_period_start);
    const endDate = new Date(invoiceRequest.billing_period_end);
    const dueDateValue = invoiceRequest.due_date
      ? new Date(invoiceRequest.due_date)
      : new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid billing period dates' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        error: 'billing_period_start must be before billing_period_end',
      });
    }

    const cdrs = await CDR.getForInvoicePeriod(customer_id, startDate, endDate);

    const invoicePayload = Invoice.prepareInvoicePayload({
      customer,
      invoiceRequest,
      cdrs,
      manualLineItems: invoiceRequest.line_items,
      usageCharges: invoiceRequest.usage_charges,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      dueDate: dueDateValue,
    });

    if (!invoicePayload) {
      return res.status(400).json({ error: 'No billable usage or manual line items provided' });
    }

    const { invoice, lineItems, taxRate, usageCharges } = await Invoice.createWithLineItems(invoicePayload);

    logger.info('Invoice generated', {
      invoice_id: invoice.id,
      customer_id,
      total_amount: invoice.total_amount,
      cdr_count: cdrs.length,
      manual_items: invoicePayload.manualItems.length,
      auto_publish: invoicePayload.autoPublish,
      tax_rate: taxRate,
      usage_charges: usageCharges,
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        invoice,
        line_items_count: lineItems,
      },
    });
  } catch (error) {
    logger.error('Failed to generate invoice', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate invoice',
      details: error.message,
    });
  }
};

// Get invoice
exports.getInvoice = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const invoice = await Invoice.getById(invoice_id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const [customer, lineItems] = await Promise.all([
      Customer.getById(invoice.customer_id),
      InvoiceLineItem.getByInvoice(invoice_id),
    ]);

    const enrichedInvoice = {
      ...invoice,
      customer_name: customer?.name || 'Unknown',
      customer_email: customer?.email,
      currency: customer?.currency || 'USD',
      subtotal_amount: invoice.subtotal,
      tax_amount: invoice.tax,
      discount_amount: invoice.discount_amount || 0,
      paid_amount: invoice.amount_paid,
      balance_due: Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0),
    };

    res.json({
      success: true,
      data: {
        invoice: enrichedInvoice,
        line_items: lineItems,
        line_items_count: lineItems.length,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch invoice', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch invoice',
      details: error.message,
    });
  }
};

// Get customer invoices
exports.getCustomerInvoices = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status } = req.query;

    let customer = null;
    if (customer_id) {
      customer = await Customer.getById(customer_id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const result = await Invoice.getByCustomer(customer_id, page, limit);
      const invoices = status
        ? result.invoices.filter((inv) => inv.status === status)
        : result.invoices;

      const total = status ? invoices.length : result.total;
      const pages = Math.max(1, Math.ceil(total / result.limit));

      return res.json({
        success: true,
        data: invoices,
        pagination: {
          page: result.page,
          limit: result.limit,
          total,
          pages,
        },
      });
    }

    const normalizedStatus = status ? String(status).trim().toLowerCase() : undefined;
    const searchTerm = req.query.search ? String(req.query.search).trim() : '';
    const result = await Invoice.getAll({ page, limit, status: normalizedStatus, search: searchTerm });

    res.json({
      success: true,
      data: result.invoices,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.max(1, Math.ceil(result.total / result.limit)),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch invoices', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch invoices',
      details: error.message,
    });
  }
};

// Get all invoices (admin view)
exports.getAllInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : undefined;

    const result = await Invoice.getAll({ page, limit, search, status });
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    res.json({
      success: true,
      data: result.invoices,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: totalPages,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch all invoices', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch invoices',
      details: error.message,
    });
  }
};

// Record payment for invoice
exports.recordPayment = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const { paid_amount, payment_date } = req.body;

    if (!paid_amount || paid_amount <= 0) {
      return res.status(400).json({ error: 'paid_amount must be positive' });
    }

    const invoice = await Invoice.getById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paidDate = payment_date ? new Date(payment_date) : new Date();

    const updatedInvoice = await Invoice.updatePayment(invoice_id, paid_amount, paidDate, 'paid');

    const customer = await Customer.getById(invoice.customer_id);
    const currentBalance = parseFloat(customer.current_balance || 0);
    const newBalance = currentBalance + parseFloat(paid_amount);

    await Customer.updateBalance(invoice.customer_id, newBalance);

    await CustomerBalance.recordTransaction({
      customer_id: invoice.customer_id,
      transaction_type: 'invoice_credit',
      amount: paid_amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_id: invoice_id,
      description: `Payment received for invoice ${invoice.invoice_number}`,
    });

    logger.info('Payment recorded', {
      invoice_id,
      paid_amount,
      customer_id: invoice.customer_id,
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: updatedInvoice,
    });
  } catch (error) {
    logger.error('Failed to record payment', { error: error.message });
    res.status(500).json({
      error: 'Failed to record payment',
      details: error.message,
    });
  }
};

// Publish invoice (draft -> issued)
exports.publishInvoice = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const invoice = await Invoice.getById(invoice_id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({
        error: `Cannot publish invoice with status: ${invoice.status}`,
      });
    }

    const publishedInvoice = await Invoice.publish(invoice_id);

    logger.info('Invoice published', {
      invoice_id,
      customer_id: invoice.customer_id,
    });

    res.json({
      success: true,
      message: 'Invoice published successfully',
      data: publishedInvoice,
    });
  } catch (error) {
    logger.error('Failed to publish invoice', { error: error.message });
    res.status(500).json({
      error: 'Failed to publish invoice',
      details: error.message,
    });
  }
};

// Cancel invoice
exports.cancelInvoice = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const invoice = await Invoice.getById(invoice_id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        message: 'Invoice already cancelled',
        data: invoice,
      });
    }

    const { reason } = parseCancellationBody(req.body);
    const cancelled = await Invoice.cancel(invoice_id, reason);

    if (!cancelled) {
      return res.status(409).json({
        error: `Invoice cannot be cancelled from status ${invoice.status}`,
      });
    }

    logger.info('Invoice cancelled', {
      invoice_id,
      reason,
    });

    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: cancelled,
    });
  } catch (error) {
    logger.error('Failed to cancel invoice', { error: error.message });
    res.status(500).json({
      error: 'Failed to cancel invoice',
      details: error.message,
    });
  }
};

// Get invoice line items
exports.getInvoiceLineItems = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const invoice = await Invoice.getById(invoice_id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const lineItems = await InvoiceLineItem.getByInvoice(invoice_id);

    res.json({
      success: true,
      data: lineItems,
      count: lineItems.length,
    });
  } catch (error) {
    logger.error('Failed to fetch line items', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch line items',
      details: error.message,
    });
  }
};

// Get billing dashboard
exports.getBillingDashboard = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { period = '30' } = req.query;

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const periodDays = parseInt(period, 10) || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const invoicesResult = await Invoice.getByCustomer(customer_id, 1, 100);
    const periodInvoices = invoicesResult.invoices.filter((inv) => {
      const createdAt = new Date(inv.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });

    const cdrsResult = await CDR.getByCustomer(customer_id, {
      start_date: startDate,
      end_date: endDate,
      page: 1,
      limit: 10000,
    });

    const balanceHistory = await CustomerBalance.getHistory(customer_id, 1, 100);
    const recentTransactions = (balanceHistory.transactions || []).slice(0, 5);

    const totalInvoiced = periodInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.total_amount || 0),
      0
    );
    const totalPaid = periodInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.amount_paid || 0),
      0
    );
    const outstanding = totalInvoiced - totalPaid;
    const totalCalls = cdrsResult.cdrs.length;
    const totalDuration = cdrsResult.cdrs.reduce(
      (sum, cdr) => sum + (cdr.duration_seconds || 0),
      0
    );
    const totalCharged = cdrsResult.cdrs.reduce(
      (sum, cdr) => sum + parseFloat(cdr.billable_amount || 0),
      0
    );

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          country: customer.country,
          currency: customer.currency,
          current_balance: parseFloat(customer.current_balance || 0),
        },
        period: {
          start_date: startDate,
          end_date: endDate,
          days: periodDays,
        },
        invoicing: {
          total_invoices: periodInvoices.length,
          total_invoiced: parseFloat(totalInvoiced.toFixed(4)),
          total_paid: parseFloat(totalPaid.toFixed(4)),
          outstanding: parseFloat(outstanding.toFixed(4)),
          invoice_statuses: {
            draft: periodInvoices.filter((inv) => inv.status === 'draft').length,
            issued: periodInvoices.filter((inv) => inv.status === 'issued').length,
            paid: periodInvoices.filter((inv) => inv.status === 'paid').length,
            overdue: periodInvoices.filter((inv) => inv.status === 'overdue').length,
          },
        },
        usage: {
          total_calls: totalCalls,
          total_duration_seconds: totalDuration,
          average_call_duration: Math.round(totalDuration / (totalCalls || 1)),
          total_charged: parseFloat(totalCharged.toFixed(4)),
          average_charge_per_call: parseFloat((totalCharged / (totalCalls || 1)).toFixed(4)),
        },
        balance_info: {
          current_balance: parseFloat(customer.current_balance || 0),
          last_transactions: recentTransactions,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get billing dashboard', { error: error.message });
    res.status(500).json({
      error: 'Failed to get billing dashboard',
      details: error.message,
    });
  }
};

// Get billing summary for all customers (admin view)
exports.getBillingOverview = async (req, res) => {
  try {
    const customersResult = await Customer.getAll(1, 10000);
    const customers = customersResult.customers;

    const stats = {
      total_customers: customers.length,
      active_customers: customers.filter((c) => c.status === 'active').length,
      total_balance_across_customers: parseFloat(
        customers.reduce((sum, c) => sum + parseFloat(c.current_balance || 0), 0).toFixed(4)
      ),
      customers_with_low_balance: customers.filter(
        (c) => parseFloat(c.current_balance || 0) < 50
      ).length,
      by_currency: {},
    };

    customers.forEach((c) => {
      if (!stats.by_currency[c.currency]) {
        stats.by_currency[c.currency] = {
          count: 0,
          total_balance: 0,
        };
      }
      stats.by_currency[c.currency].count += 1;
      stats.by_currency[c.currency].total_balance += parseFloat(c.current_balance || 0);
    });

    Object.keys(stats.by_currency).forEach((currency) => {
      stats.by_currency[currency].total_balance = parseFloat(
        stats.by_currency[currency].total_balance.toFixed(4)
      );
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get billing overview', { error: error.message });
    res.status(500).json({
      error: 'Failed to get billing overview',
      details: error.message,
    });
  }
};

// Get invoices due for payment
exports.getOverdueInvoices = async (req, res) => {
  try {
    await Invoice.markOverduePastDueDate();
    const customersResult = await Customer.getAll(1, 10000);
    const customers = customersResult.customers;
    const overdueInvoices = [];

    for (const customer of customers) {
      const invoicesResult = await Invoice.getByCustomer(customer.id, 1, 10000);
      const invoices = invoicesResult.invoices;

      invoices.forEach((inv) => {
        const dueDate = new Date(inv.due_date);
        const today = new Date();

        if (dueDate < today && inv.status !== 'paid' && inv.status !== 'cancelled') {
          const amountPaid = parseFloat(inv.amount_paid || 0);
          const outstanding = parseFloat(inv.total_amount || 0) - amountPaid;

          overdueInvoices.push({
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            customer_id: customer.id,
            customer_name: customer.name,
            total_amount: parseFloat(inv.total_amount || 0),
            amount_paid: amountPaid,
            outstanding: parseFloat(outstanding.toFixed(4)),
            due_date: inv.due_date,
            days_overdue: Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)),
            status: inv.status,
          });
        }
      });
    }

    overdueInvoices.sort((a, b) => b.days_overdue - a.days_overdue);

    res.json({
      success: true,
      data: {
        total_overdue: overdueInvoices.length,
        total_outstanding: parseFloat(
          overdueInvoices.reduce((sum, inv) => sum + inv.outstanding, 0).toFixed(4)
        ),
        invoices: overdueInvoices,
      },
    });
  } catch (error) {
    logger.error('Failed to get overdue invoices', { error: error.message });
    res.status(500).json({
      error: 'Failed to get overdue invoices',
      details: error.message,
    });
  }
};

// Get revenue analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '90' } = req.query;

    const periodDays = parseInt(period, 10) || 90;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const customersResult = await Customer.getAll(1, 10000);
    const customers = customersResult.customers;

    let totalRevenue = 0;
    let totalCalls = 0;
    const revenueByCustomer = [];

    for (const customer of customers) {
      const invoicesResult = await Invoice.getByCustomer(customer.id, 1, 10000);
      const periodInvoices = invoicesResult.invoices.filter((inv) => {
        const createdAt = new Date(inv.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      });

      const customerRevenue = periodInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.total_amount || 0),
        0
      );
      totalRevenue += customerRevenue;

      const cdrsResult = await CDR.getByCustomer(customer.id, {
        start_date: startDate,
        end_date: endDate,
        page: 1,
        limit: 10000,
      });

      totalCalls += cdrsResult.cdrs.length;

      if (customerRevenue > 0) {
        revenueByCustomer.push({
          customer_id: customer.id,
          customer_name: customer.name,
          revenue: parseFloat(customerRevenue.toFixed(4)),
          invoice_count: periodInvoices.length,
          call_count: cdrsResult.cdrs.length,
        });
      }
    }

    revenueByCustomer.sort((a, b) => b.revenue - a.revenue);
    const topCustomers = revenueByCustomer.slice(0, 10);

    res.json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate,
          days: periodDays,
        },
        totals: {
          total_revenue: parseFloat(totalRevenue.toFixed(4)),
          total_calls: totalCalls,
          average_revenue_per_call: parseFloat((totalRevenue / (totalCalls || 1)).toFixed(4)),
        },
        top_customers: topCustomers,
      },
    });
  } catch (error) {
    logger.error('Failed to get revenue analytics', { error: error.message });
    res.status(500).json({
      error: 'Failed to get revenue analytics',
      details: error.message,
    });
  }
};
