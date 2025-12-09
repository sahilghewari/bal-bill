const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class CDR {
  static async create(data) {
    const {
      customer_id,
      caller_id,
      callee_id,
      destination,
      start_time,
      end_time,
      duration_seconds,
      service_type,
      rate_card_id,
    } = data;

    const id = uuidv4();
    const query = `
      INSERT INTO cdrs
      (id, customer_id, caller_id, callee_id, destination, start_time, end_time,
       duration_seconds, service_type, rate_card_id, billing_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        customer_id,
        caller_id,
        callee_id,
        destination,
        start_time,
        end_time,
        duration_seconds,
        service_type,
        rate_card_id,
        'pending',
      ]);
      logger.info('CDR created', { cdr_id: id, customer_id });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create CDR', { error: error.message });
      throw error;
    }
  }

  static async getById(cdrId) {
    try {
      const result = await pool.query('SELECT * FROM cdrs WHERE id = $1', [cdrId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch CDR', { cdr_id: cdrId, error: error.message });
      throw error;
    }
  }

  static async getByCustomer(customerId, filters = {}) {
    const { start_date, end_date, billing_status, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions = ['customer_id = $1'];
    const params = [customerId];
    let paramIndex = 2;

    if (start_date) {
      conditions.push(`start_time >= $${paramIndex}`);
      params.push(start_date);
      paramIndex += 1;
    }

    if (end_date) {
      conditions.push(`start_time <= $${paramIndex}`);
      params.push(end_date);
      paramIndex += 1;
    }

    if (billing_status) {
      conditions.push(`billing_status = $${paramIndex}`);
      params.push(billing_status);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const dataQuery = `
      SELECT * FROM cdrs
      ${whereClause}
      ORDER BY start_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    const dataParams = [...params, limit, offset];

    try {
      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, dataParams),
        pool.query(`SELECT COUNT(*) FROM cdrs ${whereClause}`, params),
      ]);

      return {
        cdrs: dataResult.rows,
        total: Number(countResult.rows[0].count),
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to fetch CDRs', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async updateBilling(cdrId, billableSeconds, billableAmount) {
    const query = `
      UPDATE cdrs
      SET billable_seconds = $1,
          billable_amount = $2,
          billing_status = 'billed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [billableSeconds, billableAmount, cdrId]);
      logger.info('CDR billing updated', { cdr_id: cdrId, billable_amount: billableAmount });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update CDR billing', { cdr_id: cdrId, error: error.message });
      throw error;
    }
  }

  static async getUnbilled(customerId) {
    const query = `
      SELECT * FROM cdrs
      WHERE customer_id = $1 AND billing_status = 'pending'
      ORDER BY start_time ASC;
    `;

    try {
      const result = await pool.query(query, [customerId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch unbilled CDRs', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async getForInvoicePeriod(customerId, startDate, endDate) {
    const query = `
      SELECT * FROM cdrs
      WHERE customer_id = $1
        AND start_time >= $2
        AND start_time <= $3
        AND billing_status = 'billed'
      ORDER BY start_time ASC;
    `;

    try {
      const result = await pool.query(query, [customerId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch CDRs for invoice', {
        customer_id: customerId,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = CDR;
