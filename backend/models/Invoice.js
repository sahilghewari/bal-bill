const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');
const InvoiceLineItem = require('./InvoiceLineItem');

class Invoice {
  static async create(data) {
    const {
      customer_id,
      billing_period_start,
      billing_period_end,
      subtotal,
      tax = 0,
      total_amount,
      discount_amount = 0,
      notes = null,
      due_date,
    } = data;

    const id = uuidv4();
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${uuidv4()
      .substring(0, 6)
      .toUpperCase()}`;

    const query = `
      INSERT INTO invoices
      (id, customer_id, invoice_number, billing_period_start, billing_period_end,
       subtotal, tax, total_amount, discount_amount, notes, cancellation_reason, due_date, status, status_changed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        customer_id,
        invoiceNumber,
        billing_period_start,
        billing_period_end,
        subtotal,
        tax,
        total_amount,
        discount_amount,
        notes,
        null,
        due_date,
        'draft',
        now,
      ]);
      logger.info('Invoice created', { invoice_id: id, customer_id, invoice_number: invoiceNumber });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create invoice', { error: error.message });
      throw error;
    }
  }

  static sanitizeLineItems(lineItems = []) {
    return (Array.isArray(lineItems) ? lineItems : [])
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        description: typeof item.description === 'string' ? item.description.trim() : '',
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
      }))
      .filter((item) => item.description);
  }

  static prepareInvoicePayload({
    customer,
    invoiceRequest,
    cdrs,
    manualLineItems,
    usageCharges,
    billingPeriodStart,
    billingPeriodEnd,
    dueDate,
  }) {
    const sanitizedNotes = typeof invoiceRequest.notes === 'string' ? invoiceRequest.notes.trim() : null;
    const usageChargeValue = Number(usageCharges) || 0;
    const taxRateValue = Number(invoiceRequest.tax_rate) || 0;
    const discountAmountValue = Number(invoiceRequest.discount_amount) || 0;
    const autoPublish = Boolean(invoiceRequest.auto_publish);
    const manualItems = this.sanitizeLineItems(manualLineItems);

    let subtotal = usageChargeValue;
    cdrs.forEach((cdr) => {
      subtotal += parseFloat(cdr.billable_amount || 0);
    });

    manualItems.forEach((item) => {
      subtotal += item.quantity * item.unit_price;
    });

    if (!cdrs.length && !manualItems.length && subtotal <= 0) {
      return null;
    }

    const taxAmount = subtotal > 0 ? subtotal * (taxRateValue / 100) : 0;
    const totalBeforeDiscount = subtotal + taxAmount;
    const totalAmount = Math.max(totalBeforeDiscount - discountAmountValue, 0);

    return {
      customerId: customer.id,
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      subtotal,
      tax: Number(taxAmount.toFixed(4)),
      totalAmount: Number(totalAmount.toFixed(4)),
      discountAmount: Number(discountAmountValue.toFixed(4)),
      notes: sanitizedNotes,
      autoPublish,
      cdrs,
      manualItems,
      usageCharges: usageChargeValue,
      taxRate: taxRateValue,
    };
  }

  static async createWithLineItems(payload) {
    const {
      customerId,
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      subtotal,
      tax,
      totalAmount,
      discountAmount,
      notes,
      autoPublish,
      cdrs,
      manualItems,
      taxRate,
      usageCharges,
    } = payload;

    const invoice = await this.create({
      customer_id: customerId,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      subtotal,
      tax,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      notes,
      due_date: dueDate,
    });

    for (const cdr of cdrs) {
      const minutes = cdr.billable_seconds ? cdr.billable_seconds / 60 : 0;
      const totalPrice = parseFloat(cdr.billable_amount || 0);
      const unitPrice = minutes > 0 ? totalPrice / minutes : totalPrice;

      await InvoiceLineItem.create({
        invoice_id: invoice.id,
        cdr_id: cdr.id,
        description: `Call from ${cdr.caller_id} to ${cdr.callee_id} (${cdr.duration_seconds}s)`,
        quantity: Number(minutes.toFixed(4)),
        unit_price: Number(unitPrice.toFixed(6)),
        total_price: Number(totalPrice.toFixed(4)),
      });
    }

    for (const item of manualItems) {
      const totalPrice = Number((item.quantity * item.unit_price).toFixed(4));

      await InvoiceLineItem.create({
        invoice_id: invoice.id,
        cdr_id: null,
        description: item.description,
        quantity: Number(item.quantity.toFixed(4)),
        unit_price: Number(item.unit_price.toFixed(6)),
        total_price: totalPrice,
      });
    }

    let finalInvoice = invoice;
    if (autoPublish && invoice.status === 'draft') {
      const published = await this.publish(invoice.id);
      if (published) {
        finalInvoice = published;
      }
    }

    return {
      invoice: finalInvoice,
      lineItems: cdrs.length + manualItems.length,
      taxRate,
      usageCharges,
    };
  }

  static async getById(invoiceId) {
    try {
      const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch invoice', { invoice_id: invoiceId, error: error.message });
      throw error;
    }
  }

  static async getByCustomer(customerId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM invoices
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    try {
      const [dataResult, countResult] = await Promise.all([
        pool.query(query, [customerId, limit, offset]),
        pool.query('SELECT COUNT(*) FROM invoices WHERE customer_id = $1', [customerId]),
      ]);

      return {
        invoices: dataResult.rows,
        total: Number(countResult.rows[0].count),
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to fetch invoices', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async getAll({ page = 1, limit = 20, search = '', status }) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const filters = [];
    const filterParams = [];

    if (status) {
      filterParams.push(status.toLowerCase());
      filters.push(`LOWER(i.status) = $${filterParams.length}`);
    }

    if (search) {
      filterParams.push(`%${search.toLowerCase()}%`);
      const paramIndex = filterParams.length;
      filters.push(`(
        LOWER(i.invoice_number) LIKE $${paramIndex}
        OR LOWER(c.name) LIKE $${paramIndex}
        OR LOWER(c.email) LIKE $${paramIndex}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const dataQuery = `
      SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.currency
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
    `;

    const countQuery = `
      SELECT COUNT(*) AS count
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      ${whereClause};
    `;

    try {
      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [...filterParams, safeLimit, offset]),
        pool.query(countQuery, filterParams),
      ]);

      return {
        invoices: dataResult.rows,
        total: Number(countResult.rows[0]?.count || 0),
        page: safePage,
        limit: safeLimit,
      };
    } catch (error) {
      logger.error('Failed to fetch invoices', { error: error.message });
      throw error;
    }
  }

  static async updatePayment(invoiceId, paidAmount, paidDate, status = 'paid') {
    const query = `
      UPDATE invoices
      SET amount_paid = $1,
          paid_date = $2,
          status_changed_at = CASE WHEN status <> $3 THEN CURRENT_TIMESTAMP ELSE status_changed_at END,
          status = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [paidAmount, paidDate, status, invoiceId]);
      logger.info('Invoice payment recorded', { invoice_id: invoiceId, amount: paidAmount });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update invoice payment', { invoice_id: invoiceId, error: error.message });
      throw error;
    }
  }

  static async updatePdfUrl(invoiceId, pdfUrl) {
    const query = `
      UPDATE invoices
      SET pdf_url = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [pdfUrl, invoiceId]);
      logger.info('Invoice PDF URL updated', { invoice_id: invoiceId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update PDF URL', { invoice_id: invoiceId, error: error.message });
      throw error;
    }
  }

  static async publish(invoiceId) {
    const query = `
      UPDATE invoices
      SET status = 'issued',
          status_changed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'draft'
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [invoiceId]);
      logger.info('Invoice published', { invoice_id: invoiceId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to publish invoice', { invoice_id: invoiceId, error: error.message });
      throw error;
    }
  }

  static async cancel(invoiceId, reason = null) {
    const validStatuses = ['draft', 'issued', 'overdue'];
    const query = `
      UPDATE invoices
      SET status = 'cancelled',
          cancellation_reason = $2,
          status_changed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = ANY($3)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [invoiceId, reason, validStatuses]);
      if (!result.rows[0]) {
        logger.warn('Invoice cancellation skipped due to status mismatch', { invoice_id: invoiceId });
      } else {
        logger.info('Invoice cancelled', { invoice_id: invoiceId });
      }
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to cancel invoice', { invoice_id: invoiceId, error: error.message });
      throw error;
    }
  }

  static async markOverduePastDueDate(referenceDate = new Date()) {
    const query = `
      UPDATE invoices
      SET status = 'overdue',
          status_changed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'issued'
        AND due_date < $1
        AND COALESCE(amount_paid, 0) < total_amount
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [referenceDate]);
      if (result.rows.length) {
        logger.info('Invoices marked as overdue', { count: result.rows.length });
      }
      return result.rows;
    } catch (error) {
      logger.error('Failed to mark invoices overdue', { error: error.message });
      throw error;
    }
  }

  static async markCancelledBySystem(referenceDate = new Date()) {
    const gracePeriodDays = 30;
    const cutoffDate = new Date(referenceDate.getTime() - gracePeriodDays * 24 * 60 * 60 * 1000);

    const query = `
      UPDATE invoices
      SET status = 'cancelled',
          cancellation_reason = COALESCE(cancellation_reason, 'Auto-cancelled after prolonged overdue status'),
          status_changed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'overdue'
        AND due_date < $1
        AND COALESCE(amount_paid, 0) < total_amount
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [cutoffDate]);
      if (result.rows.length) {
        logger.warn('Invoices auto-cancelled due to prolonged overdue status', {
          count: result.rows.length,
          cutoff_date: cutoffDate,
        });
      }
      return result.rows;
    } catch (error) {
      logger.error('Failed to auto-cancel overdue invoices', { error: error.message });
      throw error;
    }
  }
}

module.exports = Invoice;
