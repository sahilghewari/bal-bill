const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Dashboard
router.get('/dashboard/overview', adminController.getDashboardOverview);

// Analytics
router.get('/analytics/customers', adminController.getCustomerAnalytics);
router.get('/analytics/revenue', adminController.getRevenueReport);
router.get('/analytics/payments', adminController.getPaymentAnalytics);
router.get('/analytics/usage', adminController.getUsageAnalytics);

// Reports
router.get('/reports/invoice-status', adminController.getInvoiceStatusReport);
router.get('/reports/export', adminController.exportReport);

// System
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/logs', adminController.getSystemLogs);

module.exports = router;
