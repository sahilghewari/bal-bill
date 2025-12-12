const request = require('supertest');
const { pool } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

let app;
let customerId;
let activeInvoiceId;

const insertCustomer = async () => {
  customerId = uuidv4();
  await pool.query(
    `INSERT INTO customers
      (id, name, email, phone, country, currency, current_balance, status, billing_day,
       stripe_customer_id, stripe_default_payment_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NULL, NULL)`,
    [
      customerId,
      'Billing Test Customer',
      `billing-${Date.now()}@example.com`,
      '+1-555-0000',
      'USA',
      'USD',
      200,
      10,
    ]
  );
};

const insertRateCard = async () => {
  const rateCardId = uuidv4();
  await pool.query(
    `INSERT INTO rate_cards
      (id, customer_id, service_type, initial_block_seconds, next_block_seconds,
       price_per_minute, connection_fee_flat, effective_date, currency, status)
     VALUES ($1, $2, 'voice', 60, 30, 0.05, 0.01, $3, 'USD', 'active')`,
    [rateCardId, customerId, new Date().toISOString()]
  );
};

const insertBilledCDR = async () => {
  const cdrId = uuidv4();
  const start = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 180 * 1000);

  await pool.query(
    `INSERT INTO cdrs
      (id, customer_id, caller_id, callee_id, destination, start_time, end_time,
       duration_seconds, service_type, billable_seconds, billable_amount, billing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 180, 'voice', 180, 0.15, 'billed')`,
    [cdrId, customerId, '+10000000001', '+19999999999', 'US', start, end]
  );
};

beforeAll(async () => {
  app = require('../../server');
  await insertCustomer();
  await insertRateCard();
  await insertBilledCDR();
});

describe('Billing API', () => {
  describe('POST /api/billing/:customer_id/generate-invoice', () => {
    test('rejects missing billing period', async () => {
      const res = await request(app)
        .post(`/api/billing/${customerId}/generate-invoice`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('billing_period_start');
    });

    test('creates invoice with manual items and tax', async () => {
  const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();

      const res = await request(app)
        .post(`/api/billing/${customerId}/generate-invoice`)
        .send({
          billing_period_start: startDate,
          billing_period_end: endDate,
          usage_charges: 10,
          tax_rate: 0.18,
          discount_amount: 1,
          line_items: [
            {
              description: 'Onboarding fee',
              quantity: 1,
              unit_price: 25,
            },
          ],
          auto_publish: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.status).toBe('issued');
      expect(Number(res.body.data.invoice.tax)).toBeGreaterThan(0);
      expect(res.body.data.line_items_count).toBeGreaterThanOrEqual(1);

      activeInvoiceId = res.body.data.invoice.id;
    });
  });

  describe('GET /api/billing/invoice/:invoice_id', () => {
    test('returns invoice and line items', async () => {
      const res = await request(app).get(`/api/billing/invoice/${activeInvoiceId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.id).toBe(activeInvoiceId);
      expect(Array.isArray(res.body.data.line_items)).toBe(true);
    });
  });

  describe('POST /api/billing/invoice/:invoice_id/payment', () => {
    test('rejects non-positive amount', async () => {
      const res = await request(app)
        .post(`/api/billing/invoice/${activeInvoiceId}/payment`)
        .send({ paid_amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('paid_amount');
    });

    test('records payment successfully', async () => {
      const res = await request(app)
        .post(`/api/billing/invoice/${activeInvoiceId}/payment`)
        .send({ paid_amount: 20 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('paid');
    });
  });

  describe('POST /api/billing/invoice/:invoice_id/cancel', () => {
    test('does not cancel paid invoice', async () => {
      const res = await request(app)
        .post(`/api/billing/invoice/${activeInvoiceId}/cancel`)
        .send({ reason: 'Testing' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('cannot be cancelled');
    });
  });
});
