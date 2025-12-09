const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class Invoice {
  static async create(data) {
    const {
      customer_id,
      billing_period_start,
      billing_period_end,
      subtotal,
      tax = 0,
      total_amount,
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
       subtotal, tax, total_amount, due_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        due_date,
        'draft',
      ]);
      logger.info('Invoice created', { invoice_id: id, customer_id, invoice_number: invoiceNumber });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create invoice', { error: error.message });
      throw error;
    }
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
      SET status = 'issued', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
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
}

module.exports = Invoice;
