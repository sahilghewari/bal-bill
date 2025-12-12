const request = require('supertest');
const app = require('../../server');

describe('Scheduler health endpoint', () => {
  test('returns success payload even when queues use stub implementation', async () => {
    const res = await request(app).get('/api/scheduler/queues/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('queue_available');
    expect(res.body).toHaveProperty('queues');
    expect(Array.isArray(res.body.queues)).toBe(true);
  });
});
