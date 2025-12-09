const express = require('express');
const router = express.Router();
const ratecardController = require('../controllers/ratecardController');

// Create rate card
router.post('/', ratecardController.createRateCard);
router.post('/:customer_id/version', ratecardController.createRateCardVersion);

// Customer scoped rate cards
router.get('/customer/:customer_id/active', ratecardController.getActiveRateCard);
router.get('/customer/:customer_id/history', ratecardController.getRateCardHistory);
router.get('/customer/:customer_id/stats', ratecardController.getRateCardStats);
router.get('/customer/:customer_id', ratecardController.getCustomerRateCards);

// Utilities
router.post('/:customer_id/simulate', ratecardController.simulateBilling);
router.post('/compare', ratecardController.compareRateCards);

// Update / deactivate
router.put('/:rate_card_id', ratecardController.updateRateCard);
router.post('/:rate_card_id/deactivate', ratecardController.deactivateRateCard);

// Single rate card
router.get('/:rate_card_id', ratecardController.getRateCard);

module.exports = router;
