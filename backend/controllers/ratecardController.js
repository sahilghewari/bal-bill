const RateCard = require('../models/RateCard');
const Customer = require('../models/Customer');
const RatingEngine = require('../utils/ratingEngine');
const { validateRateCard } = require('../utils/validators');
const logger = require('../middleware/logger');

// Create new rate card
exports.createRateCard = async (req, res) => {
  try {
    const {
      customer_id,
      service_type,
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat,
      effective_date,
      currency,
    } = req.body;

    const { error } = validateRateCard(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    try {
      RatingEngine.validateRateCard({
        initial_block_seconds,
        next_block_seconds,
        price_per_minute,
        connection_fee_flat: connection_fee_flat || 0,
      });
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid rate card configuration',
        details: validationError.message,
      });
    }

    const currencyCode = currency || customer.currency;

    const rateCard = await RateCard.create({
      customer_id,
      service_type,
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat: connection_fee_flat || 0,
      effective_date,
      currency: currencyCode,
    });

    logger.info('Rate card created', {
      rate_card_id: rateCard.id,
      customer_id,
      service_type,
      effective_date,
    });

    res.status(201).json({
      success: true,
      message: 'Rate card created successfully',
      data: rateCard,
    });
  } catch (error) {
    logger.error('Failed to create rate card', { error: error.message });
    res.status(500).json({
      error: 'Failed to create rate card',
      details: error.message,
    });
  }
};

// Get all rate cards for a customer
exports.getCustomerRateCards = async (req, res) => {
  try {
    const { customer_id } = req.params;

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const rateCards = await RateCard.getByCustomer(customer_id);
    const grouped = {
      DID: rateCards.filter((rc) => rc.service_type === 'DID'),
      VIRTUAL_NUMBER: rateCards.filter((rc) => rc.service_type === 'VIRTUAL_NUMBER'),
    };

    res.json({
      success: true,
      data: {
        customer_id,
        total_rate_cards: rateCards.length,
        by_service_type: grouped,
        all_rate_cards: rateCards,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch rate cards', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch rate cards',
      details: error.message,
    });
  }
};

// Get single rate card
exports.getRateCard = async (req, res) => {
  try {
    const { rate_card_id } = req.params;
    const rateCard = await RateCard.getById(rate_card_id);

    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found' });
    }

    res.json({ success: true, data: rateCard });
  } catch (error) {
    logger.error('Failed to fetch rate card', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch rate card',
      details: error.message,
    });
  }
};

// Get active rate card for customer on specific date
exports.getActiveRateCard = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { service_type, call_date } = req.query;

    if (!service_type) {
      return res.status(400).json({
        error: 'service_type query parameter is required',
      });
    }

    if (!call_date) {
      return res.status(400).json({
        error: 'call_date query parameter is required (format: YYYY-MM-DD)',
      });
    }

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const rateCard = await RateCard.getActiveForCustomer(customer_id, call_date, service_type);

    if (!rateCard) {
      return res.status(404).json({
        error: `No active rate card found for ${service_type} on ${call_date}`,
      });
    }

    res.json({
      success: true,
      data: {
        customer_id,
        service_type,
        call_date,
        active_rate_card: rateCard,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch active rate card', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch active rate card',
      details: error.message,
    });
  }
};

// Update rate card
exports.updateRateCard = async (req, res) => {
  try {
    const { rate_card_id } = req.params;
    const {
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat,
      status,
      currency,
    } = req.body;

    const rateCard = await RateCard.getById(rate_card_id);
    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found' });
    }

    const pricingFieldsProvided = [
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat,
    ].some((value) => value !== undefined);

    if (pricingFieldsProvided) {
      try {
        RatingEngine.validateRateCard({
          initial_block_seconds: initial_block_seconds || rateCard.initial_block_seconds,
          next_block_seconds: next_block_seconds || rateCard.next_block_seconds,
          price_per_minute: price_per_minute || rateCard.price_per_minute,
          connection_fee_flat:
            connection_fee_flat !== undefined ? connection_fee_flat : rateCard.connection_fee_flat,
        });
      } catch (validationError) {
        return res.status(400).json({
          error: 'Invalid rate card configuration',
          details: validationError.message,
        });
      }
    }

    const updatedRateCard = await RateCard.update(rate_card_id, {
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat,
      status,
      currency,
    });

    logger.info('Rate card updated', {
      rate_card_id,
      customer_id: rateCard.customer_id,
    });

    res.json({
      success: true,
      message: 'Rate card updated successfully',
      data: updatedRateCard,
    });
  } catch (error) {
    logger.error('Failed to update rate card', { error: error.message });
    res.status(500).json({
      error: 'Failed to update rate card',
      details: error.message,
    });
  }
};

// Deactivate rate card
exports.deactivateRateCard = async (req, res) => {
  try {
    const { rate_card_id } = req.params;

    const rateCard = await RateCard.getById(rate_card_id);
    if (!rateCard) {
      return res.status(404).json({ error: 'Rate card not found' });
    }

    const deactivatedRateCard = await RateCard.deactivate(rate_card_id);

    logger.info('Rate card deactivated', {
      rate_card_id,
      customer_id: rateCard.customer_id,
    });

    res.json({
      success: true,
      message: 'Rate card deactivated successfully',
      data: deactivatedRateCard,
    });
  } catch (error) {
    logger.error('Failed to deactivate rate card', { error: error.message });
    res.status(500).json({
      error: 'Failed to deactivate rate card',
      details: error.message,
    });
  }
};

// Simulate billing with rate card
exports.simulateBilling = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { duration_seconds, service_type, call_date } = req.body;

    if (!duration_seconds || duration_seconds <= 0) {
      return res.status(400).json({
        error: 'duration_seconds must be positive',
      });
    }

    if (!service_type) {
      return res.status(400).json({ error: 'service_type is required' });
    }

    const date = call_date || new Date().toISOString().split('T')[0];

    const simulation = await RatingEngine.simulateBilling(
      customer_id,
      duration_seconds,
      service_type,
      date
    );

    res.json({
      success: true,
      data: {
        duration_seconds,
        service_type,
        call_date: date,
        current_balance: simulation.currentBalance,
        rate_card: {
          id: simulation.rateCard.id,
          initial_block_seconds: simulation.rateCard.initial_block_seconds,
          next_block_seconds: simulation.rateCard.next_block_seconds,
          price_per_minute: simulation.rateCard.price_per_minute,
          connection_fee_flat: simulation.rateCard.connection_fee_flat,
        },
        charge_details: simulation.chargeDetails,
        balance_after: simulation.balanceAfter,
        sufficient_balance: simulation.sufficient,
      },
    });
  } catch (error) {
    logger.error('Billing simulation failed', { error: error.message });
    res.status(400).json({
      error: error.message,
      details: error.message,
    });
  }
};

// Get rate card history (all versions for a customer and service)
exports.getRateCardHistory = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { service_type } = req.query;

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const allRateCards = await RateCard.getByCustomer(customer_id);

    let filtered = allRateCards;
    if (service_type) {
      filtered = allRateCards.filter((rc) => rc.service_type === service_type);
    }

    filtered.sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));

    res.json({
      success: true,
      data: {
        customer_id,
        service_type: service_type || 'ALL',
        total_versions: filtered.length,
        history: filtered.map((rc) => ({
          id: rc.id,
          service_type: rc.service_type,
          effective_date: rc.effective_date,
          initial_block_seconds: rc.initial_block_seconds,
          next_block_seconds: rc.next_block_seconds,
          price_per_minute: rc.price_per_minute,
          connection_fee_flat: rc.connection_fee_flat,
          status: rc.status,
          created_at: rc.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch rate card history', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch rate card history',
      details: error.message,
    });
  }
};

// Create new rate card version (with effective date)
exports.createRateCardVersion = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const {
      service_type,
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat,
      effective_date,
    } = req.body;

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const existingRateCards = await RateCard.getByCustomer(customer_id);
    const existingCard = existingRateCards.find((rc) => rc.service_type === service_type);

    if (!existingCard) {
      return res.status(400).json({
        error: `No existing rate card for service type: ${service_type}`,
        hint: 'Create a new rate card first, then create versions',
      });
    }

    const effectiveDate = new Date(effective_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (effectiveDate < today) {
      return res.status(400).json({
        error: 'Effective date must be today or in the future',
      });
    }

    try {
      RatingEngine.validateRateCard({
        initial_block_seconds,
        next_block_seconds,
        price_per_minute,
        connection_fee_flat: connection_fee_flat || 0,
      });
    } catch (validationError) {
      return res.status(400).json({
        error: 'Invalid rate card configuration',
        details: validationError.message,
      });
    }

    const newVersion = await RateCard.create({
      customer_id,
      service_type,
      initial_block_seconds,
      next_block_seconds,
      price_per_minute,
      connection_fee_flat: connection_fee_flat || 0,
      effective_date,
    });

    logger.info('Rate card version created', {
      rate_card_id: newVersion.id,
      customer_id,
      service_type,
      effective_date,
    });

    res.status(201).json({
      success: true,
      message: 'Rate card version created successfully',
      data: {
        new_version: newVersion,
        note: `This rate card will be active from ${effective_date}`,
      },
    });
  } catch (error) {
    logger.error('Failed to create rate card version', { error: error.message });
    res.status(500).json({
      error: 'Failed to create rate card version',
      details: error.message,
    });
  }
};

// Compare rate cards (show pricing difference)
exports.compareRateCards = async (req, res) => {
  try {
    const { rate_card_id_1, rate_card_id_2, test_duration } = req.body;

    if (!rate_card_id_1 || !rate_card_id_2) {
      return res.status(400).json({
        error: 'Both rate_card_id_1 and rate_card_id_2 are required',
      });
    }

    if (!test_duration || test_duration <= 0) {
      return res.status(400).json({
        error: 'test_duration must be positive (in seconds)',
      });
    }

    const rateCard1 = await RateCard.getById(rate_card_id_1);
    const rateCard2 = await RateCard.getById(rate_card_id_2);

    if (!rateCard1 || !rateCard2) {
      return res.status(404).json({
        error: 'One or both rate cards not found',
      });
    }

    const charge1 = RatingEngine.calculateCharge(test_duration, rateCard1);
    const charge2 = RatingEngine.calculateCharge(test_duration, rateCard2);

    const difference = charge1.totalCharge - charge2.totalCharge;
    const percentDifference =
      charge2.totalCharge === 0
        ? 'Infinity'
        : ((difference / charge2.totalCharge) * 100).toFixed(2);

    res.json({
      success: true,
      data: {
        test_duration,
        rate_card_1: {
          id: rateCard1.id,
          service_type: rateCard1.service_type,
          charge: charge1.totalCharge,
        },
        rate_card_2: {
          id: rateCard2.id,
          service_type: rateCard2.service_type,
          charge: charge2.totalCharge,
        },
        comparison: {
          card_1_charge: charge1.totalCharge,
          card_2_charge: charge2.totalCharge,
          difference: Number(difference.toFixed(4)),
          percent_difference: percentDifference,
          cheaper: difference < 0 ? 'rate_card_1' : difference > 0 ? 'rate_card_2' : 'equal',
        },
        details: {
          rate_card_1: charge1,
          rate_card_2: charge2,
        },
      },
    });
  } catch (error) {
    logger.error('Rate card comparison failed', { error: error.message });
    res.status(500).json({
      error: 'Rate card comparison failed',
      details: error.message,
    });
  }
};

// Get rate card statistics
exports.getRateCardStats = async (req, res) => {
  try {
    const { customer_id } = req.params;

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const rateCards = await RateCard.getByCustomer(customer_id);

    if (!rateCards.length) {
      return res.json({
        success: true,
        data: {
          total_rate_cards: 0,
          active_rate_cards: 0,
          inactive_rate_cards: 0,
          by_service_type: {
            DID: 0,
            VIRTUAL_NUMBER: 0,
          },
          average_price_per_minute: '0.000000',
          min_price_per_minute: '0.000000',
          max_price_per_minute: '0.000000',
        },
      });
    }

    const prices = rateCards.map((rc) => parseFloat(rc.price_per_minute));
    const stats = {
      total_rate_cards: rateCards.length,
      active_rate_cards: rateCards.filter((rc) => rc.status === 'active').length,
      inactive_rate_cards: rateCards.filter((rc) => rc.status === 'inactive').length,
      by_service_type: {
        DID: rateCards.filter((rc) => rc.service_type === 'DID').length,
        VIRTUAL_NUMBER: rateCards.filter((rc) => rc.service_type === 'VIRTUAL_NUMBER').length,
      },
      average_price_per_minute: (prices.reduce((sum, val) => sum + val, 0) / prices.length).toFixed(6),
      min_price_per_minute: Math.min(...prices).toFixed(6),
      max_price_per_minute: Math.max(...prices).toFixed(6),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to get rate card stats', { error: error.message });
    res.status(500).json({
      error: 'Failed to get rate card stats',
      details: error.message,
    });
  }
};
