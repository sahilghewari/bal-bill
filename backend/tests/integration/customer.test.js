const request = require('supertest');

let app;
let customerId;

beforeAll(() => {
  app = require('../../server');
});

describe('Customer API', () => {
  describe('POST /api/customers', () => {
    test('creates a new customer', async () => {
      const email = `test-${Date.now()}@example.com`;
      const res = await request(app).post('/api/customers').send({
        name: 'Test Customer',
        email,
        phone: '+1-555-0000',
        country: 'USA',
        currency: 'USD',
        billing_day: 15,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Customer');
      expect(res.body.data.currency).toBe('USD');
      customerId = res.body.data.id;
    });

    test('rejects duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      await request(app).post('/api/customers').send({
        name: 'Customer 1',
        email,
        country: 'USA',
        currency: 'USD',
      });

      const res = await request(app).post('/api/customers').send({
        name: 'Customer 2',
        email,
        country: 'USA',
        currency: 'USD',
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    test('validates required fields', async () => {
      const res = await request(app).post('/api/customers').send({ name: 'Incomplete' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/customers/:customer_id', () => {
    test('fetches customer by ID', async () => {
      const res = await request(app).get(`/api/customers/${customerId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(customerId);
    });

    test('returns 404 for missing customer', async () => {
      const res = await request(app).get('/api/customers/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('POST /api/customers/:customer_id/add-credit', () => {
    test('adds credit to customer balance', async () => {
      const res = await request(app)
        .post(`/api/customers/${customerId}/add-credit`)
        .send({
          amount: 100,
          description: 'Test recharge',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance_after).toBeGreaterThanOrEqual(100);
    });

    test('rejects negative amounts', async () => {
      const res = await request(app)
        .post(`/api/customers/${customerId}/add-credit`)
        .send({ amount: -50 });

      expect(res.status).toBe(400);
    });
  });
});
