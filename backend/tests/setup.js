const { pool } = require('../config/database');
const logger = require('../middleware/logger');

const createTestTables = `
  DROP TABLE IF EXISTS stripe_transactions CASCADE;
  DROP TABLE IF EXISTS invoice_line_items CASCADE;
  DROP TABLE IF EXISTS invoices CASCADE;
  DROP TABLE IF EXISTS customer_balance_history CASCADE;
  DROP TABLE IF EXISTS cdrs CASCADE;
  DROP TABLE IF EXISTS rate_cards CASCADE;
  DROP TABLE IF EXISTS customers CASCADE;

  CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    current_balance DECIMAL(15, 4) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    billing_day INTEGER DEFAULT 1,
    stripe_customer_id VARCHAR(255),
    stripe_default_payment_method VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_customers_email ON customers(email);
  CREATE INDEX idx_customers_status ON customers(status);

  CREATE TABLE IF NOT EXISTS rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    initial_block_seconds INTEGER NOT NULL,
    next_block_seconds INTEGER NOT NULL,
    price_per_minute DECIMAL(10, 6) NOT NULL,
    connection_fee_flat DECIMAL(10, 4) DEFAULT 0.00,
    effective_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cdrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    caller_id VARCHAR(50) NOT NULL,
    callee_id VARCHAR(50) NOT NULL,
    destination VARCHAR(100),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_seconds INTEGER NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    billable_seconds INTEGER,
    billable_amount DECIMAL(15, 4),
    billing_status VARCHAR(20) DEFAULT 'pending',
    rate_card_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_cdrs_customer ON cdrs(customer_id);
  CREATE INDEX idx_cdrs_start_time ON cdrs(start_time);
  CREATE INDEX idx_cdrs_billing_status ON cdrs(billing_status);

  CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subtotal DECIMAL(15, 4) NOT NULL,
    tax DECIMAL(15, 4) DEFAULT 0.00,
    total_amount DECIMAL(15, 4) NOT NULL,
    discount_amount DECIMAL(15, 4) DEFAULT 0.00,
    notes TEXT,
    cancellation_reason TEXT,
    amount_paid DECIMAL(15, 4) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'draft',
    due_date DATE NOT NULL,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_invoices_customer ON invoices(customer_id);
  CREATE INDEX idx_invoices_status ON invoices(status);

  CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    cdr_id UUID,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 6) NOT NULL,
    total_price DECIMAL(15, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);

  CREATE TABLE IF NOT EXISTS customer_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 4) NOT NULL,
    balance_before DECIMAL(15, 4) NOT NULL,
    balance_after DECIMAL(15, 4) NOT NULL,
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stripe_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    invoice_id UUID,
    stripe_payment_intent_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    amount DECIMAL(15, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(100),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const dropTestTables = `
  DROP TABLE IF EXISTS stripe_transactions CASCADE;
  DROP TABLE IF EXISTS invoice_line_items CASCADE;
  DROP TABLE IF EXISTS invoices CASCADE;
  DROP TABLE IF EXISTS customer_balance_history CASCADE;
  DROP TABLE IF EXISTS cdrs CASCADE;
  DROP TABLE IF EXISTS rate_cards CASCADE;
  DROP TABLE IF EXISTS customers CASCADE;
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
