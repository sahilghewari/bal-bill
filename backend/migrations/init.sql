-- Enable UUID helpers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables for a clean slate
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS stripe_transactions CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS customer_balance_history CASCADE;
DROP TABLE IF EXISTS cdrs CASCADE;
DROP TABLE IF EXISTS rate_cards CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  country VARCHAR(50) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  current_balance DECIMAL(15, 4) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  billing_day INTEGER CHECK (billing_day BETWEEN 1 AND 28) DEFAULT 1,
  stripe_customer_id VARCHAR(255),
  stripe_default_payment_method VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);

-- Rate cards table
CREATE TABLE rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL,
  initial_block_seconds INTEGER NOT NULL,
  next_block_seconds INTEGER NOT NULL,
  price_per_minute DECIMAL(10, 6) NOT NULL,
  connection_fee_flat DECIMAL(10, 4) DEFAULT 0.00,
  effective_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_cards_customer ON rate_cards(customer_id);
CREATE INDEX idx_rate_cards_effective_date ON rate_cards(effective_date);
CREATE INDEX idx_rate_cards_status ON rate_cards(status);

-- Call detail records
CREATE TABLE cdrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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
  rate_card_id UUID REFERENCES rate_cards(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cdrs_customer ON cdrs(customer_id);
CREATE INDEX idx_cdrs_start_time ON cdrs(start_time);
CREATE INDEX idx_cdrs_billing_status ON cdrs(billing_status);
CREATE INDEX idx_cdrs_rate_card ON cdrs(rate_card_id);

-- Customer balance history
CREATE TABLE customer_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 4) NOT NULL,
  balance_before DECIMAL(15, 4) NOT NULL,
  balance_after DECIMAL(15, 4) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_balance_history_customer ON customer_balance_history(customer_id);
CREATE INDEX idx_balance_history_transaction_type ON customer_balance_history(transaction_type);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Invoice line items
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  cdr_id UUID REFERENCES cdrs(id),
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 6) NOT NULL,
  total_price DECIMAL(15, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);

-- Stripe transactions
CREATE TABLE stripe_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
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

CREATE INDEX idx_stripe_customer ON stripe_transactions(customer_id);
CREATE INDEX idx_stripe_status ON stripe_transactions(status);

-- System logs
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_level ON system_logs(level);
CREATE INDEX idx_logs_created_at ON system_logs(created_at);
