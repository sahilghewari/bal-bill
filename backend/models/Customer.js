const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class Customer {
  static async create(data) {
    const { name, email, phone, country, currency, billing_day = 1 } = data;
    const id = uuidv4();
    const query = `
      INSERT INTO customers
      (id, name, email, phone, country, currency, billing_day, status, stripe_customer_id, stripe_default_payment_method)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        name,
        email,
        phone,
        country,
        currency,
        billing_day,
        'active',
        null,
        null,
      ]);
      logger.info('Customer created', { customer_id: id });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create customer', { error: error.message });
      throw error;
    }
  }

  static async getById(customerId) {
    try {
      const result = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch customer', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async getByEmail(email) {
    try {
      const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch customer by email', { email, error: error.message });
      throw error;
    }
  }

  static async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const listQuery = `
      SELECT * FROM customers
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;

    try {
      const [listResult, countResult] = await Promise.all([
        pool.query(listQuery, [limit, offset]),
        pool.query('SELECT COUNT(*) FROM customers'),
      ]);

      return {
        customers: listResult.rows,
        total: Number(countResult.rows[0].count),
        page,
        limit,
      };
    } catch (error) {
      logger.error('Failed to fetch all customers', { error: error.message });
      throw error;
    }
  }

  static async update(customerId, data) {
    const {
      name,
      phone,
      status,
      billing_day,
      currency,
      stripe_customer_id,
      stripe_default_payment_method,
    } = data;
    const query = `
      UPDATE customers
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          status = COALESCE($3, status),
          billing_day = COALESCE($4, billing_day),
          currency = COALESCE($5, currency),
          stripe_customer_id = COALESCE($6, stripe_customer_id),
          stripe_default_payment_method = COALESCE($7, stripe_default_payment_method),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        name,
        phone,
        status,
        billing_day,
        currency,
        stripe_customer_id,
        stripe_default_payment_method,
        customerId,
      ]);
      logger.info('Customer updated', { customer_id: customerId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update customer', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async delete(customerId) {
    const query = `
      UPDATE customers
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [customerId]);
      logger.info('Customer deleted', { customer_id: customerId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to delete customer', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async getBalance(customerId) {
    try {
      const result = await pool.query('SELECT current_balance FROM customers WHERE id = $1', [customerId]);
      if (!result.rows[0]) {
        return null;
      }
      return Number(result.rows[0].current_balance);
    } catch (error) {
      logger.error('Failed to fetch balance', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async updateBalance(customerId, newBalance) {
    const query = `
      UPDATE customers
      SET current_balance = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING current_balance;
    `;

    try {
      const result = await pool.query(query, [newBalance, customerId]);
      logger.info('Customer balance updated', { customer_id: customerId, balance: newBalance });
      return Number(result.rows[0]?.current_balance);
    } catch (error) {
      logger.error('Failed to update balance', { customer_id: customerId, error: error.message });
      throw error;
    }
  }
}

module.exports = Customer;
