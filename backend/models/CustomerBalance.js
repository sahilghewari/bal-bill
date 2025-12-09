const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class CustomerBalance {
  static async recordTransaction(data) {
    const {
      customer_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      reference_id,
      description,
    } = data;

    const id = uuidv4();
    const query = `
      INSERT INTO customer_balance_history
      (id, customer_id, transaction_type, amount, balance_before, balance_after,
       reference_id, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        customer_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        description,
      ]);
      logger.info('Balance transaction recorded', { customer_id, transaction_type, amount });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to record balance transaction', { error: error.message });
      throw error;
    }
  }

  static async getHistory(customerId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM customer_balance_history
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    try {
      const [dataResult, countResult] = await Promise.all([
        pool.query(query, [customerId, limit, offset]),
        pool.query('SELECT COUNT(*) FROM customer_balance_history WHERE customer_id = $1', [customerId]),
      ]);

      return {
        transactions: dataResult.rows,
        total: Number(countResult.rows[0].count),
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to fetch balance history', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async getSummary(customerId) {
    const query = `
      SELECT 
        SUM(CASE WHEN transaction_type = 'recharge' THEN amount ELSE 0 END) AS total_recharged,
        SUM(CASE WHEN transaction_type = 'call_deduction' THEN amount ELSE 0 END) AS total_deducted,
        SUM(CASE WHEN transaction_type = 'manual_adjustment' THEN amount ELSE 0 END) AS total_adjustments
      FROM customer_balance_history
      WHERE customer_id = $1;
    `;

    try {
      const result = await pool.query(query, [customerId]);
      const row = result.rows[0] || {};
      return {
        total_recharged: Number(row.total_recharged || 0),
        total_deducted: Number(row.total_deducted || 0),
        total_adjustments: Number(row.total_adjustments || 0),
      };
    } catch (error) {
      logger.error('Failed to fetch balance summary', { customer_id: customerId, error: error.message });
      throw error;
    }
  }
}

module.exports = CustomerBalance;
