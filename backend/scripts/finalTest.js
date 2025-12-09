require('dotenv').config();
const axios = require('axios');
const logger = require('../middleware/logger');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Final integration tests for production readiness
 */
const runFinalTests = async () => {
  logger.info('🧪 Running final integration tests...\n');

  try {
    // Test 1: Health check
    logger.info('Test 1: Health endpoint');
    const healthRes = await axios.get(`${BASE_URL}/health`);
    if (healthRes.status === 200) {
      logger.info('✅ Health check passed\n');
    } else {
      throw new Error('Health check failed');
    }

    // Test 2: Create customer
    logger.info('Test 2: Create customer');
    const customerRes = await axios.post(`${BASE_URL}/api/customers`, {
      name: 'Integration Test Customer',
      email: `test-${Date.now()}@example.com`,
      country: 'USA',
      currency: 'USD',
      billing_day: 15,
    });
    const customerId = customerRes.data.data.id;
    logger.info(`✅ Customer created: ${customerId}\n`);

    // Test 3: Create rate card
    logger.info('Test 3: Create rate card');
    const rateCardRes = await axios.post(`${BASE_URL}/api/rateCards`, {
      customer_id: customerId,
      service_type: 'DID',
      initial_block_seconds: 60,
      next_block_seconds: 60,
      price_per_minute: 0.004,
      connection_fee_flat: 0,
      effective_date: new Date().toISOString().split('T')[0],
    });
    const rateCardId = rateCardRes.data.data.id;
    logger.info(`✅ Rate card created: ${rateCardId}\n`);

    // Test 4: Add credit
    logger.info('Test 4: Add credit');
    const creditRes = await axios.post(`${BASE_URL}/api/customers/${customerId}/add-credit`, {
      amount: 500,
      description: 'Integration test credit',
    });
    logger.info(`✅ Credit added: ${creditRes.data.data.balance_after}\n`);

    // Test 5: Get customer balance
    logger.info('Test 5: Get customer balance');
    const balanceRes = await axios.get(`${BASE_URL}/api/customers/${customerId}/balance`);
    logger.info(`✅ Balance retrieved: ${balanceRes.data.data.current_balance}\n`);

    // Test 6: Get admin overview
    logger.info('Test 6: Get admin dashboard');
    await axios.get(`${BASE_URL}/api/admin/dashboard/overview`);
    logger.info('✅ Admin dashboard accessible\n');

    // Test 7: Health check again
    logger.info('Test 7: Final health check');
    await axios.get(`${BASE_URL}/health`);
    logger.info('✅ Final health check passed\n');

    logger.info('✅ All integration tests passed!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Integration test failed', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    process.exit(1);
  }
};

runFinalTests();
