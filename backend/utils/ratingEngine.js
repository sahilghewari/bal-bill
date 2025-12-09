const logger = require('../middleware/logger');
const Customer = require('../models/Customer');
const RateCard = require('../models/RateCard');
const CustomerBalance = require('../models/CustomerBalance');
const CDR = require('../models/CDR');

class RatingEngine {
  static ceilDiv(a, b) {
    return Math.floor((a + b - 1) / b);
  }

  static calculateBillableSeconds(durationSeconds, rateCard) {
    const { initial_block_seconds, next_block_seconds } = rateCard;

    if (durationSeconds <= initial_block_seconds) {
      return initial_block_seconds;
    }

    const remaining = durationSeconds - initial_block_seconds;
    const extraBlocks = this.ceilDiv(remaining, next_block_seconds);
    return initial_block_seconds + extraBlocks * next_block_seconds;
  }

  static calculateCharge(durationSeconds, rateCard) {
    try {
      const billableSeconds = this.calculateBillableSeconds(durationSeconds, rateCard);
      const billableMinutes = billableSeconds / 60.0;
      const usageCharge = billableMinutes * parseFloat(rateCard.price_per_minute);
      const connectionFee = parseFloat(rateCard.connection_fee_flat || 0);
      const totalCharge = connectionFee + usageCharge;

      return {
        billableSeconds,
        billableMinutes: Number(billableMinutes.toFixed(4)),
        usageCharge: Number(usageCharge.toFixed(4)),
        connectionFee,
        totalCharge: Number(totalCharge.toFixed(4)),
      };
    } catch (error) {
      logger.error('Failed to calculate charge', { error: error.message });
      throw new Error(`Charge calculation failed: ${error.message}`);
    }
  }

  static async processCDR(cdrId) {
    const cdr = await CDR.getById(cdrId);

    if (!cdr) {
      const error = `CDR not found: ${cdrId}`;
      logger.error('CDR Processing Error', { cdr_id: cdrId, error });
      return { success: false, error };
    }

    if (cdr.billing_status !== 'pending') {
      const error = `CDR already billed or failed: ${cdrId}`;
      logger.warn('CDR Already Billed', { cdr_id: cdrId, error });
      return { success: false, error };
    }

    try {
      const customer = await Customer.getById(cdr.customer_id);
      if (!customer) {
        throw new Error(`Customer not found: ${cdr.customer_id}`);
      }

      const callDate = new Date(cdr.start_time).toISOString().split('T')[0];
      const rateCard = await RateCard.getActiveForCustomer(
        cdr.customer_id,
        callDate,
        cdr.service_type
      );

      if (!rateCard) {
        throw new Error(`No active rate card found for customer ${cdr.customer_id} on ${callDate}`);
      }

      const chargeDetails = this.calculateCharge(cdr.duration_seconds, rateCard);
      const totalCharge = chargeDetails.totalCharge;

      const currentBalance = Number(customer.current_balance);
      if (currentBalance < totalCharge) {
        logger.warn('Insufficient Balance', {
          cdr_id: cdrId,
          current_balance: currentBalance,
          required: totalCharge,
        });
        return {
          success: false,
          error: `Insufficient balance. Required: ${totalCharge}, Available: ${currentBalance}`,
          current_balance: currentBalance,
          required_balance: totalCharge,
        };
      }

      const newBalance = currentBalance - totalCharge;
      await Customer.updateBalance(cdr.customer_id, newBalance);

      await CDR.updateBilling(cdrId, chargeDetails.billableSeconds, chargeDetails.totalCharge);

      await CustomerBalance.recordTransaction({
        customer_id: cdr.customer_id,
        transaction_type: 'call_deduction',
        amount: totalCharge,
        balance_before: currentBalance,
        balance_after: newBalance,
        reference_id: cdrId,
        description: `Call from ${cdr.caller_id} to ${cdr.callee_id} (${cdr.duration_seconds}s)`,
      });

      logger.info('CDR Processed Successfully', {
        cdr_id: cdrId,
        customer_id: cdr.customer_id,
        charge: totalCharge,
        balance_after: newBalance,
      });

      return {
        success: true,
        charge: chargeDetails,
        balance_after: newBalance,
        rate_card_id: rateCard.id,
      };
    } catch (error) {
      logger.error('CDR Processing Failed', {
        cdr_id: cdrId,
        error: error.message,
      });

      try {
        await CDR.updateBilling(cdrId, null, null);
      } catch (updateError) {
        logger.error('Failed to mark CDR as failed', { error: updateError.message });
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async processCustomerCDRs(customerId) {
    try {
      const unbilledCDRs = await CDR.getUnbilled(customerId);

      const results = {
        processed: 0,
        failed: 0,
        skipped: 0,
        totalCharge: 0,
        failedCDRs: [],
      };

      for (const cdr of unbilledCDRs) {
        const result = await this.processCDR(cdr.id);

        if (result.success) {
          results.processed += 1;
          results.totalCharge += result.charge.totalCharge;
        } else if (result.error.includes('Insufficient balance')) {
          results.skipped += 1;
        } else {
          results.failed += 1;
          results.failedCDRs.push({ cdr_id: cdr.id, error: result.error });
        }
      }

      logger.info('Batch CDR Processing Complete', {
        customer_id: customerId,
        ...results,
      });

      return results;
    } catch (error) {
      logger.error('Batch CDR Processing Failed', {
        customer_id: customerId,
        error: error.message,
      });
      throw error;
    }
  }

  static validateRateCard(rateCard) {
    const errors = [];

    if (!rateCard.initial_block_seconds || rateCard.initial_block_seconds <= 0) {
      errors.push('initial_block_seconds must be positive');
    }

    if (!rateCard.next_block_seconds || rateCard.next_block_seconds <= 0) {
      errors.push('next_block_seconds must be positive');
    }

    if (!rateCard.price_per_minute || rateCard.price_per_minute < 0) {
      errors.push('price_per_minute must be non-negative');
    }

    if (rateCard.connection_fee_flat < 0) {
      errors.push('connection_fee_flat cannot be negative');
    }

    if (errors.length) {
      const errorMsg = `Rate Card Validation Failed: ${errors.join(', ')}`;
      logger.error(errorMsg, { rate_card: rateCard });
      throw new Error(errorMsg);
    }

    return true;
  }

  static async simulateBilling(customerId, durationSeconds, serviceType, callDate) {
    try {
      const rateCard = await RateCard.getActiveForCustomer(customerId, callDate, serviceType);

      if (!rateCard) {
        throw new Error(`No active rate card for customer on ${callDate}`);
      }

      const chargeDetails = this.calculateCharge(durationSeconds, rateCard);
      const customer = await Customer.getById(customerId);
      const balanceAfter = Number(customer.current_balance) - chargeDetails.totalCharge;

      return {
        rateCard,
        chargeDetails,
        currentBalance: Number(customer.current_balance),
        balanceAfter,
        sufficient: balanceAfter >= 0,
      };
    } catch (error) {
      logger.error('Billing Simulation Failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = RatingEngine;
