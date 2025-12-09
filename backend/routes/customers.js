const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/', customerController.createCustomer);
router.get('/', customerController.getAllCustomers);
router.get('/search', customerController.searchCustomers);
router.get('/stats/overview', customerController.getCustomerStats);
router.get('/:customer_id', customerController.getCustomer);
router.get('/:customer_id/summary', customerController.getCustomerSummary);
router.put('/:customer_id', customerController.updateCustomer);
router.delete('/:customer_id', customerController.deleteCustomer);

router.get('/:customer_id/balance', customerController.getCustomerBalance);
router.post('/:customer_id/add-credit', customerController.addCredit);
router.post('/:customer_id/adjust-balance', customerController.adjustBalance);
router.get('/:customer_id/balance-history', customerController.getBalanceHistory);

module.exports = router;
