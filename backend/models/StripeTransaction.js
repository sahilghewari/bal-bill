const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class StripeTransaction {
  static async create(data) {
    const {
      customer_id,
      invoice_id,
      stripe_payment_intent_id,
      amount,
      currency,
      status,
      payment_method,
    } = data;

    const id = uuidv4();
    const query = `
      INSERT INTO stripe_transactions
      (id, customer_id, invoice_id, stripe_payment_intent_id, amount, currency, status, payment_method, stripe_customer_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        customer_id,
        invoice_id,
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        payment_method,
        data.stripe_customer_id || null,
      ]);
      logger.info('Stripe transaction created', { transaction_id: id, customer_id, amount });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create stripe transaction', { error: error.message });
      throw error;
    }
  }

  static async getById(transactionId) {
    try {
      const result = await pool.query('SELECT * FROM stripe_transactions WHERE id = $1', [transactionId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch stripe transaction', { transaction_id: transactionId, error: error.message });
      throw error;
    }
  }

  static async getByPaymentIntentId(paymentIntentId) {
    try {
      const result = await pool.query(
        'SELECT * FROM stripe_transactions WHERE stripe_payment_intent_id = $1',
        [paymentIntentId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch transaction by intent', {
        payment_intent_id: paymentIntentId,
        error: error.message,
      });
      throw error;
    }
  }

  static async getByCustomer(customerId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const listQuery = `
      SELECT * FROM stripe_transactions
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    try {
      const [listResult, countResult] = await Promise.all([
        pool.query(listQuery, [customerId, limit, offset]),
        pool.query('SELECT COUNT(*) FROM stripe_transactions WHERE customer_id = $1', [customerId]),
      ]);

      return {
        transactions: listResult.rows,
        total: Number(countResult.rows[0].count),
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to fetch customer transactions', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async updateStatus(transactionId, status, errorMessage = null) {
    const query = `
      UPDATE stripe_transactions
      SET status = $1,
          error_message = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [status, errorMessage, transactionId]);
      logger.info('Stripe transaction status updated', { transaction_id: transactionId, status });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update stripe transaction status', {
        transaction_id: transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  static async setRetry(transactionId, retryCount, nextRetryTime) {
    const query = `
      UPDATE stripe_transactions
      SET retry_count = $1,
          next_retry_at = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [retryCount, nextRetryTime, transactionId]);
      logger.info('Stripe transaction retry scheduled', {
        transaction_id: transactionId,
        retry_count: retryCount,
        next_retry_at: nextRetryTime,
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to schedule retry', { transaction_id: transactionId, error: error.message });
      throw error;
    }
  }

  static async getFailedForRetry(maxRetryAttempts = 3) {
    const query = `
      SELECT * FROM stripe_transactions
      WHERE status IN ('requires_payment_method', 'processing')
        AND next_retry_at IS NOT NULL
        AND next_retry_at <= CURRENT_TIMESTAMP
        AND retry_count < $1
      ORDER BY next_retry_at ASC;
    `;

    try {
      const result = await pool.query(query, [maxRetryAttempts]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch failed stripe transactions', { error: error.message });
      throw error;
    }
  }
}

module.exports = StripeTransaction;
