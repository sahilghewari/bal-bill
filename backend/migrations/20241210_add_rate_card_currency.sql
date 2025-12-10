ALTER TABLE rate_cards
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

UPDATE rate_cards rc
SET currency = c.currency
FROM customers c
WHERE rc.customer_id = c.id
  AND rc.currency IS NULL;

ALTER TABLE rate_cards
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE rate_cards
  ALTER COLUMN currency SET DEFAULT 'USD';
