const express = require('express');
const router = express.Router();
const cdrController = require('../controllers/cdrController');

router.post('/import', cdrController.importCDR);
router.post('/import-batch', cdrController.importBatchCDRs);

router.post('/process/:cdr_id', cdrController.processCDR);
router.post('/process-customer/:customer_id', cdrController.processCustomerCDRs);

router.get('/customer/:customer_id', cdrController.getCustomerCDRs);
router.get('/detail/:cdr_id', cdrController.getCDR);
router.get('/stats/:customer_id', cdrController.getBillingStats);

module.exports = router;
