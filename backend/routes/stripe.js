const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// Payment intents
router.post('/invoice/:invoice_id/create-intent', stripeController.createPaymentIntent);
router.post('/intent/:payment_intent_id/confirm', stripeController.confirmPaymentIntent);
router.get('/intent/:payment_intent_id/status', stripeController.getPaymentIntentStatus);

// Payment methods
router.get('/:customer_id/payment-methods', stripeController.getPaymentMethods);

// Transactions
router.get('/:customer_id/transactions', stripeController.getTransactionHistory);

// Retry failed
router.post('/retry-failed', stripeController.retryFailedPayments);

module.exports = router;
