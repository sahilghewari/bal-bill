const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class RateCard {
  static async create(data) {
    const {
      customer_id,
      service_type,
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat = 0,
      effective_date,
      currency,
    } = data;

    const id = uuidv4();
    const query = `
      INSERT INTO rate_cards
      (id, customer_id, service_type, initial_block_seconds, next_block_seconds,
       price_per_minute, connection_fee_flat, effective_date, status, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        customer_id,
        service_type,
        initial_block_seconds,
        next_block_seconds,
        price_per_minute,
        connection_fee_flat,
        effective_date,
        'active',
        currency,
      ]);
      logger.info('Rate card created', { rate_card_id: id, customer_id });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create rate card', { error: error.message });
      throw error;
    }
  }

  static async getById(rateCardId) {
    try {
      const result = await pool.query('SELECT * FROM rate_cards WHERE id = $1', [rateCardId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch rate card', { rate_card_id: rateCardId, error: error.message });
      throw error;
    }
  }

  static async getActiveForCustomer(customerId, callDate, serviceType) {
    const query = `
      SELECT * FROM rate_cards
      WHERE customer_id = $1
        AND service_type = $2
        AND effective_date <= $3
        AND status = 'active'
      ORDER BY effective_date DESC
      LIMIT 1;
    `;

    try {
      const result = await pool.query(query, [customerId, serviceType, callDate]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch active rate card', {
        customer_id: customerId,
        error: error.message,
      });
      throw error;
    }
  }

  static async getByCustomer(customerId) {
    const query = `
      SELECT * FROM rate_cards
      WHERE customer_id = $1
      ORDER BY created_at DESC;
    `;

    try {
      const result = await pool.query(query, [customerId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch rate cards', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async update(rateCardId, data) {
    const {
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat,
      status,
      currency,
    } = data;

    const query = `
      UPDATE rate_cards
      SET initial_block_seconds = COALESCE($1, initial_block_seconds),
          next_block_seconds = COALESCE($2, next_block_seconds),
          price_per_minute = COALESCE($3, price_per_minute),
          connection_fee_flat = COALESCE($4, connection_fee_flat),
          status = COALESCE($5, status),
          currency = COALESCE($6, currency),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        initial_block_seconds,
        next_block_seconds,
        price_per_minute,
        connection_fee_flat,
        status,
        currency,
        rateCardId,
      ]);
      logger.info('Rate card updated', { rate_card_id: rateCardId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update rate card', { rate_card_id: rateCardId, error: error.message });
      throw error;
    }
  }

  static async deactivate(rateCardId) {
    const query = `
      UPDATE rate_cards
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [rateCardId]);
      logger.info('Rate card deactivated', { rate_card_id: rateCardId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to deactivate rate card', { rate_card_id: rateCardId, error: error.message });
      throw error;
    }
  }
}

module.exports = RateCard;
