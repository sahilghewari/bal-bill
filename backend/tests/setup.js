const { pool } = require('../config/database');
const logger = require('../middleware/logger');

const createTestTables = `
  DROP TABLE IF EXISTS test_transactions CASCADE;
  DROP TABLE IF EXISTS test_stripe_transactions CASCADE;
  DROP TABLE IF EXISTS test_invoice_line_items CASCADE;
  DROP TABLE IF EXISTS test_invoices CASCADE;
  DROP TABLE IF EXISTS test_customer_balance_history CASCADE;
  DROP TABLE IF EXISTS test_cdrs CASCADE;
  DROP TABLE IF EXISTS test_rate_cards CASCADE;
  DROP TABLE IF EXISTS test_customers CASCADE;

  CREATE TABLE test_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    current_balance DECIMAL(15, 4) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    billing_day INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_test_customers_email ON test_customers(email);
  CREATE INDEX idx_test_customers_status ON test_customers(status);
`;

const dropTestTables = `
  DROP TABLE IF EXISTS test_transactions CASCADE;
  DROP TABLE IF EXISTS test_stripe_transactions CASCADE;
  DROP TABLE IF EXISTS test_invoice_line_items CASCADE;
  DROP TABLE IF EXISTS test_invoices CASCADE;
  DROP TABLE IF EXISTS test_customer_balance_history CASCADE;
  DROP TABLE IF EXISTS test_cdrs CASCADE;
  DROP TABLE IF EXISTS test_rate_cards CASCADE;
  DROP TABLE IF EXISTS test_customers CASCADE;
`;

const setupTestDatabase = async () => {
  try {
    logger.info('Setting up test database...');
    await pool.query(createTestTables);
    logger.info('Test database setup complete');
  } catch (error) {
    logger.error('Test database setup failed', { error: error.message });
    throw error;
  }
};

const teardownTestDatabase = async () => {
  try {
    logger.info('Tearing down test database...');
    await pool.query(dropTestTables);
    logger.info('Test database teardown complete');
  } catch (error) {
    logger.error('Test database teardown failed', { error: error.message });
  }
};

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
  await pool.end();
});

module.exports = {
  setupTestDatabase,
  teardownTestDatabase,
};
