const logger = require('../middleware/logger');

if (!process.env.STRIPE_SECRET_KEY) {
  logger.error('STRIPE_SECRET_KEY is not configured');
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
