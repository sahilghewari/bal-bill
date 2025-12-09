const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class InvoiceLineItem {
  static async create(data) {
    const { invoice_id, cdr_id, description, quantity, unit_price, total_price } = data;
    const id = uuidv4();
    const query = `
      INSERT INTO invoice_line_items
      (id, invoice_id, cdr_id, description, quantity, unit_price, total_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        invoice_id,
        cdr_id,
        description,
        quantity,
        unit_price,
        total_price,
      ]);
      logger.info('Invoice line item created', { line_item_id: id, invoice_id });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create invoice line item', { error: error.message });
      throw error;
    }
  }

  static async getByInvoice(invoiceId) {
    const query = `
      SELECT * FROM invoice_line_items
      WHERE invoice_id = $1
      ORDER BY created_at ASC;
    `;

    try {
      const result = await pool.query(query, [invoiceId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch invoice line items', { invoice_id: invoiceId, error: error.message });
      throw error;
    }
  }
}

module.exports = InvoiceLineItem;
