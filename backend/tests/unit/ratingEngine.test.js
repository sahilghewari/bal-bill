const RatingEngine = require('../../utils/ratingEngine');

describe('RatingEngine', () => {
  describe('ceilDiv', () => {
    test('calculates ceiling division correctly', () => {
      expect(RatingEngine.ceilDiv(5, 60)).toBe(1);
      expect(RatingEngine.ceilDiv(60, 60)).toBe(1);
      expect(RatingEngine.ceilDiv(61, 60)).toBe(2);
      expect(RatingEngine.ceilDiv(120, 60)).toBe(2);
    });
  });

  describe('calculateBillableSeconds', () => {
    const rateCard60 = {
      initial_block_seconds: 60,
      next_block_seconds: 60,
      price_per_minute: 0.004,
      connection_fee_flat: 0,
    };

    const rateCard6 = {
      initial_block_seconds: 6,
      next_block_seconds: 6,
      price_per_minute: 0.0045,
      connection_fee_flat: 0.05,
    };

    test('bills initial block when duration within block', () => {
      expect(RatingEngine.calculateBillableSeconds(30, rateCard60)).toBe(60);
      expect(RatingEngine.calculateBillableSeconds(60, rateCard60)).toBe(60);
    });

    test('rounds up to next block when exceeding initial', () => {
      expect(RatingEngine.calculateBillableSeconds(65, rateCard60)).toBe(120);
      expect(RatingEngine.calculateBillableSeconds(121, rateCard60)).toBe(180);
    });

    test('handles 6/6 block plan', () => {
      expect(RatingEngine.calculateBillableSeconds(6, rateCard6)).toBe(6);
      expect(RatingEngine.calculateBillableSeconds(65, rateCard6)).toBe(66);
    });
  });

  describe('calculateCharge', () => {
    const baseRateCard = {
      initial_block_seconds: 60,
      next_block_seconds: 60,
      price_per_minute: 0.004,
      connection_fee_flat: 0,
    };

    test('calculates usage charge for 65 seconds', () => {
      const result = RatingEngine.calculateCharge(65, baseRateCard);
      expect(result.billableSeconds).toBe(120);
      expect(result.billableMinutes).toBe(2);
      expect(result.usageCharge).toBe(0.008);
      expect(result.totalCharge).toBe(0.008);
    });

    test('includes connection fee when provided', () => {
      const rateCardWithFee = { ...baseRateCard, connection_fee_flat: 0.05 };
      const result = RatingEngine.calculateCharge(65, rateCardWithFee);
      expect(result.connectionFee).toBe(0.05);
      expect(result.totalCharge).toBe(0.058);
    });
  });

  describe('validateRateCard', () => {
    test('allows valid rate card', () => {
      const card = {
        initial_block_seconds: 60,
        next_block_seconds: 60,
        price_per_minute: 0.004,
        connection_fee_flat: 0,
      };
      expect(() => RatingEngine.validateRateCard(card)).not.toThrow();
    });

    test('throws for invalid configuration', () => {
      const invalid = {
        initial_block_seconds: -60,
        next_block_seconds: 60,
        price_per_minute: 0.004,
        connection_fee_flat: 0,
      };
      expect(() => RatingEngine.validateRateCard(invalid)).toThrow();
    });
  });
});
