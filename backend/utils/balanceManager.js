const logger = require('../middleware/logger');
const Customer = require('../models/Customer');
const CustomerBalance = require('../models/CustomerBalance');

class BalanceManager {
  static async addCredit(customerId, amount, description = 'Manual recharge') {
    try {
      if (amount <= 0) {
        throw new Error('Recharge amount must be positive');
      }

      const customer = await Customer.getById(customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      const currentBalance = Number(customer.current_balance);
      const newBalance = currentBalance + amount;

      await Customer.updateBalance(customerId, newBalance);

      await CustomerBalance.recordTransaction({
        customer_id: customerId,
        transaction_type: 'recharge',
        amount,
        balance_before: currentBalance,
        balance_after: newBalance,
        description,
      });

      logger.info('Credit Added', {
        customer_id: customerId,
        amount,
        balance_after: newBalance,
      });

      return {
        success: true,
        balance_before: currentBalance,
        balance_after: newBalance,
      };
    } catch (error) {
      logger.error('Failed to add credit', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async makeAdjustment(customerId, amount, reason) {
    try {
      const customer = await Customer.getById(customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      const currentBalance = Number(customer.current_balance);
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        logger.warn('Adjustment would make balance negative', {
          customer_id: customerId,
          current_balance: currentBalance,
          adjustment: amount,
        });
      }

      await Customer.updateBalance(customerId, newBalance);

      await CustomerBalance.recordTransaction({
        customer_id: customerId,
        transaction_type: 'manual_adjustment',
        amount: Math.abs(amount),
        balance_before: currentBalance,
        balance_after: newBalance,
        description: reason,
      });

      logger.info('Balance Adjustment Made', {
        customer_id: customerId,
        adjustment: amount,
        balance_after: newBalance,
        reason,
      });

      return {
        success: true,
        balance_before: currentBalance,
        balance_after: newBalance,
      };
    } catch (error) {
      logger.error('Failed to make adjustment', { customer_id: customerId, error: error.message });
      throw error;
    }
  }

  static async getBalanceStatus(customerId) {
    try {
      const customer = await Customer.getById(customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      const summary = await CustomerBalance.getSummary(customerId);
      const balance = Number(customer.current_balance);

      let status = 'healthy';
      let recommendation = 'No action needed';

      if (balance < 10) {
        status = 'critical';
        recommendation = 'Recharge immediately to avoid service suspension';
      } else if (balance < 50) {
        status = 'low';
        recommendation = 'Balance is low. Consider recharging soon';
      }

      return {
        customer_id: customerId,
        current_balance: balance,
        status,
        recommendation,
        summary,
      };
    } catch (error) {
      logger.error('Failed to get balance status', { customer_id: customerId, error: error.message });
      throw error;
    }
  }
}

module.exports = BalanceManager;
