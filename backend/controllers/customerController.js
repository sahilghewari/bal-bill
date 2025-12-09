const Customer = require('../models/Customer');
const RateCard = require('../models/RateCard');
const BalanceManager = require('../utils/balanceManager');
const CustomerBalance = require('../models/CustomerBalance');
const { validateCustomer } = require('../utils/validators');
const logger = require('../middleware/logger');

exports.createCustomer = async (req, res) => {
  try {
    const { error } = validateCustomer(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }

    const existingCustomer = await Customer.getByEmail(req.body.email);
    if (existingCustomer) {
      return res.status(409).json({ error: 'Customer with this email already exists' });
    }

    const customer = await Customer.create(req.body);
    logger.info('Customer created successfully', { customer_id: customer.id });

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    logger.error('Failed to create customer', { error: error.message });
    return res.status(500).json({ error: 'Failed to create customer', details: error.message });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await Customer.getAll(page, limit);

    return res.json({
      success: true,
      data: result.customers,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch customers', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.getById(customer_id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [rateCards, balanceHistory, balanceSummary] = await Promise.all([
      RateCard.getByCustomer(customer_id),
      CustomerBalance.getHistory(customer_id, 1, 10),
      CustomerBalance.getSummary(customer_id),
    ]);

    return res.json({
      success: true,
      data: {
        ...customer,
        rate_cards: rateCards,
        balance_history: balanceHistory.transactions,
        balance_summary: balanceSummary,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch customer', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch customer', details: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.getById(customer_id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updatedCustomer = await Customer.update(customer_id, req.body);
    logger.info('Customer updated', { customer_id });

    return res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer,
    });
  } catch (error) {
    logger.error('Failed to update customer', { error: error.message });
    return res.status(500).json({ error: 'Failed to update customer', details: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.getById(customer_id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const deletedCustomer = await Customer.delete(customer_id);
    logger.info('Customer deleted (soft)', { customer_id });

    return res.json({
      success: true,
      message: 'Customer deleted successfully',
      data: deletedCustomer,
    });
  } catch (error) {
    logger.error('Failed to delete customer', { error: error.message });
    return res.status(500).json({ error: 'Failed to delete customer', details: error.message });
  }
};

exports.getCustomerBalance = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.getById(customer_id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const balanceStatus = await BalanceManager.getBalanceStatus(customer_id);
    return res.json({ success: true, data: balanceStatus });
  } catch (error) {
    logger.error('Failed to get balance', { error: error.message });
    return res.status(500).json({ error: 'Failed to get balance', details: error.message });
  }
};

exports.addCredit = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await BalanceManager.addCredit(customer_id, amount, description || 'Manual recharge');
    logger.info('Credit added to customer', { customer_id, amount });

    return res.json({
      success: true,
      message: 'Credit added successfully',
      data: {
        balance_before: result.balance_before,
        balance_after: result.balance_after,
        amount_added: amount,
      },
    });
  } catch (error) {
    logger.error('Failed to add credit', { error: error.message });
    return res.status(500).json({ error: 'Failed to add credit', details: error.message });
  }
};

exports.adjustBalance = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { amount, reason } = req.body;

    if (amount === undefined) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await BalanceManager.makeAdjustment(customer_id, amount, reason);
    logger.info('Balance adjusted', { customer_id, adjustment: amount, reason });

    return res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: {
        balance_before: result.balance_before,
        balance_after: result.balance_after,
        adjustment: amount,
        reason,
      },
    });
  } catch (error) {
    logger.error('Failed to adjust balance', { error: error.message });
    return res.status(500).json({ error: 'Failed to adjust balance', details: error.message });
  }
};

exports.getBalanceHistory = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await CustomerBalance.getHistory(customer_id, page, limit);

    return res.json({
      success: true,
      data: result.transactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch balance history', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch balance history', details: error.message });
  }
};

exports.getCustomerSummary = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.getById(customer_id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [balanceStatus, rateCards] = await Promise.all([
      BalanceManager.getBalanceStatus(customer_id),
      RateCard.getByCustomer(customer_id),
    ]);

    return res.json({
      success: true,
      data: {
        customer_id: customer.id,
        name: customer.name,
        email: customer.email,
        country: customer.country,
        currency: customer.currency,
        current_balance: Number(customer.current_balance),
        status: customer.status,
        billing_day: customer.billing_day,
        balance_status: balanceStatus.status,
        recommendation: balanceStatus.recommendation,
        rate_cards_count: rateCards.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get customer summary', { error: error.message });
    return res.status(500).json({ error: 'Failed to get customer summary', details: error.message });
  }
};

exports.getCustomerStats = async (req, res) => {
  try {
    const allCustomers = await Customer.getAll(1, 10000);
    const stats = {
      total_customers: allCustomers.total,
      active_customers: allCustomers.customers.filter((c) => c.status === 'active').length,
      inactive_customers: allCustomers.customers.filter((c) => c.status === 'inactive').length,
      total_balance: Number(
        allCustomers.customers.reduce((sum, c) => sum + Number(c.current_balance || 0), 0).toFixed(4)
      ),
      by_currency: {
        USD: allCustomers.customers.filter((c) => c.currency === 'USD').length,
        CAD: allCustomers.customers.filter((c) => c.currency === 'CAD').length,
        PHP: allCustomers.customers.filter((c) => c.currency === 'PHP').length,
      },
      by_country: {},
    };

    allCustomers.customers.forEach((c) => {
      stats.by_country[c.country] = (stats.by_country[c.country] || 0) + 1;
    });

    return res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get customer stats', { error: error.message });
    return res.status(500).json({ error: 'Failed to get customer stats', details: error.message });
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const allCustomers = await Customer.getAll(1, 1000);
    const q = query.toLowerCase();
    const results = allCustomers.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );

    return res.json({ success: true, data: results.slice(0, 20), count: results.length });
  } catch (error) {
    logger.error('Customer search failed', { error: error.message });
    return res.status(500).json({ error: 'Customer search failed', details: error.message });
  }
};
