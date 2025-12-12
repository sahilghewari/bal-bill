const logger = require('../middleware/logger');

let stripeClient = null;

const getStripeClient = () => {
  if (stripeClient) {
    return stripeClient;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('STRIPE_SECRET_KEY not set – Stripe features disabled');
    return null;
  }

  stripeClient = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

module.exports = getStripeClient;
