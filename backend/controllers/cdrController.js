const CDR = require('../models/CDR');
const RatingEngine = require('../utils/ratingEngine');
const logger = require('../middleware/logger');

exports.importCDR = async (req, res) => {
  try {
    const {
      customer_id,
      caller_id,
      callee_id,
      destination,
      start_time,
      end_time,
      duration_seconds,
      service_type,
    } = req.body;

    if (!customer_id || !caller_id || !callee_id || !duration_seconds || !service_type) {
      return res.status(400).json({
        error: 'Missing required fields: customer_id, caller_id, callee_id, duration_seconds, service_type',
      });
    }

    const cdr = await CDR.create({
      customer_id,
      caller_id,
      callee_id,
      destination,
      start_time,
      end_time,
      duration_seconds,
      service_type,
    });

    logger.info('CDR imported', { cdr_id: cdr.id, customer_id });

    return res.status(201).json({
      success: true,
      message: 'CDR imported successfully',
      cdr,
    });
  } catch (error) {
    logger.error('CDR import failed', { error: error.message });
    return res.status(500).json({
      error: 'Failed to import CDR',
      details: error.message,
    });
  }
};

exports.importBatchCDRs = async (req, res) => {
  try {
    const { cdrs } = req.body;

    if (!Array.isArray(cdrs) || !cdrs.length) {
      return res.status(400).json({ error: 'cdrs must be a non-empty array' });
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [],
    };

    for (const cdrData of cdrs) {
      try {
        const cdr = await CDR.create(cdrData);
        results.imported += 1;
        logger.info('CDR imported (batch)', { cdr_id: cdr.id });
      } catch (error) {
        results.failed += 1;
        results.errors.push({ cdr_data: cdrData, error: error.message });
        logger.error('CDR batch import failed', { error: error.message });
      }
    }

    return res.status(200).json({
      success: results.failed === 0,
      message: `Imported ${results.imported}/${cdrs.length} CDRs`,
      results,
    });
  } catch (error) {
    logger.error('Batch CDR import failed', { error: error.message });
    return res.status(500).json({
      error: 'Batch CDR import failed',
      details: error.message,
    });
  }
};

exports.processCDR = async (req, res) => {
  try {
    const { cdr_id } = req.params;
    const result = await RatingEngine.processCDR(cdr_id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        current_balance: result.current_balance,
        required_balance: result.required_balance,
      });
    }

    return res.json({
      success: true,
      message: 'CDR processed successfully',
      charge: result.charge,
      balance_after: result.balance_after,
      rate_card_id: result.rate_card_id,
    });
  } catch (error) {
    logger.error('CDR processing failed', { error: error.message });
    return res.status(500).json({
      error: 'Failed to process CDR',
      details: error.message,
    });
  }
};

exports.processCustomerCDRs = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const results = await RatingEngine.processCustomerCDRs(customer_id);

    return res.json({
      success: true,
      message: 'Customer CDRs processed',
      results,
    });
  } catch (error) {
    logger.error('Customer CDR processing failed', { error: error.message });
    return res.status(500).json({
      error: 'Failed to process customer CDRs',
      details: error.message,
    });
  }
};

exports.getCustomerCDRs = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { start_date, end_date, billing_status, page, limit } = req.query;

    const filters = {
      start_date,
      end_date,
      billing_status,
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    };

    const result = await CDR.getByCustomer(customer_id, filters);

    return res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to fetch customer CDRs', { error: error.message });
    return res.status(500).json({
      error: 'Failed to fetch CDRs',
      details: error.message,
    });
  }
};

exports.getCDR = async (req, res) => {
  try {
    const { cdr_id } = req.params;
    const cdr = await CDR.getById(cdr_id);

    if (!cdr) {
      return res.status(404).json({ error: 'CDR not found' });
    }

    return res.json({ success: true, data: cdr });
  } catch (error) {
    logger.error('Failed to fetch CDR', { error: error.message });
    return res.status(500).json({
      error: 'Failed to fetch CDR',
      details: error.message,
    });
  }
};

exports.getBillingStats = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { start_date, end_date } = req.query;

    const filters = {
      start_date,
      end_date,
      billing_status: 'billed',
      page: 1,
      limit: 10000,
    };

    const result = await CDR.getByCustomer(customer_id, filters);
    const cdrs = result.cdrs;

    const stats = {
      total_calls: cdrs.length,
      total_duration_seconds: cdrs.reduce((sum, cdr) => sum + cdr.duration_seconds, 0),
      total_billable_seconds: cdrs.reduce((sum, cdr) => sum + (cdr.billable_seconds || 0), 0),
      total_charged: Number(
        cdrs.reduce((sum, cdr) => sum + Number(cdr.billable_amount || 0), 0).toFixed(4)
      ),
      average_call_duration:
        cdrs.length > 0
          ? Math.round(cdrs.reduce((sum, cdr) => sum + cdr.duration_seconds, 0) / cdrs.length)
          : 0,
      pending_cdrs: 0,
    };

    const pendingResult = await CDR.getByCustomer(customer_id, {
      billing_status: 'pending',
      page: 1,
      limit: 1,
    });
    stats.pending_cdrs = pendingResult.total;

    return res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get billing stats', { error: error.message });
    return res.status(500).json({
      error: 'Failed to get billing stats',
      details: error.message,
    });
  }
};
