const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

// Invoice operations
router.post('/:customer_id/generate-invoice', billingController.generateInvoice);
router.get('/invoice/:invoice_id', billingController.getInvoice);
router.get('/invoice/:invoice_id/line-items', billingController.getInvoiceLineItems);
router.get('/invoices', billingController.getAllInvoices);
router.get('/:customer_id/invoices', billingController.getCustomerInvoices);

// Payment operations
router.post('/invoice/:invoice_id/payment', billingController.recordPayment);
router.post('/invoice/:invoice_id/publish', billingController.publishInvoice);
router.post('/invoice/:invoice_id/cancel', billingController.cancelInvoice);

// Dashboard & analytics
router.get('/:customer_id/dashboard', billingController.getBillingDashboard);
router.get('/overview/all', billingController.getBillingOverview);
router.get('/overdue/invoices', billingController.getOverdueInvoices);
router.get('/analytics/revenue', billingController.getRevenueAnalytics);

module.exports = router;
