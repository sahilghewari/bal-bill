ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_default_payment_method VARCHAR(255);

ALTER TABLE stripe_transactions
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
