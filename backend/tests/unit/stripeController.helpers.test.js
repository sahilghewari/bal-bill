jest.mock('../../config/stripe', () => ({
  customers: {
    retrieve: jest.fn(),
  },
}));

jest.mock('../../models/StripeTransaction', () => ({
  setRetry: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock('../../models/Customer', () => ({
  update: jest.fn(),
}));

const stripe = require('../../config/stripe');
const StripeTransaction = require('../../models/StripeTransaction');
const Customer = require('../../models/Customer');

const controller = require('../../controllers/stripeController');

describe('Stripe controller helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveDefaultPaymentMethod', () => {
    const baseCustomer = { id: 'cust-1', stripe_default_payment_method: null };

    test('returns stored default payment method when present', async () => {
      const customer = { ...baseCustomer, stripe_default_payment_method: 'pm_stored' };

      const method = await controller.__test__.resolveDefaultPaymentMethod(customer, 'cus_123');
      expect(method).toBe('pm_stored');
      expect(stripe.customers.retrieve).not.toHaveBeenCalled();
    });

    test('fetches and caches default payment method from Stripe customer', async () => {
      stripe.customers.retrieve.mockResolvedValueOnce({
        invoice_settings: {
          default_payment_method: { id: 'pm_invoice_default' },
        },
      });

      const method = await controller.__test__.resolveDefaultPaymentMethod(baseCustomer, 'cus_789');

      expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_789', {
        expand: ['invoice_settings.default_payment_method'],
      });
      expect(Customer.update).toHaveBeenCalledWith('cust-1', {
        stripe_default_payment_method: 'pm_invoice_default',
      });
      expect(method).toBe('pm_invoice_default');
    });

    test('returns null if no default payment method found', async () => {
      stripe.customers.retrieve.mockResolvedValueOnce({
        invoice_settings: {},
      });

      const method = await controller.__test__.resolveDefaultPaymentMethod(baseCustomer, 'cus_none');
      expect(method).toBeNull();
    });

    test('logs and swallows Stripe errors', async () => {
      stripe.customers.retrieve.mockRejectedValueOnce(new Error('boom'));
      const method = await controller.__test__.resolveDefaultPaymentMethod(baseCustomer, 'cus_err');
      expect(method).toBeNull();
    });
  });

  describe('scheduleRetry', () => {
    const transaction = { id: 'txn_1', retry_count: 1, error_message: 'Last failure' };

    test('increments retry count and schedules future time', async () => {
      const before = Date.now();
      await controller.__test__.scheduleRetry(transaction, 2, 'requires_payment_method', 'Need PM');
      const after = Date.now();

      expect(StripeTransaction.setRetry).toHaveBeenCalledTimes(1);
      const [, retryCount, nextRetryAt] = StripeTransaction.setRetry.mock.calls[0];
      expect(retryCount).toBe(2);
      expect(nextRetryAt.getTime()).toBeGreaterThanOrEqual(before + (2 * 60 * 60 * 1000) - 1000);
      expect(nextRetryAt.getTime()).toBeLessThanOrEqual(after + (2 * 60 * 60 * 1000) + 1000);

      expect(StripeTransaction.updateStatus).toHaveBeenCalledWith(
        'txn_1',
        'requires_payment_method',
        'Need PM'
      );
    });

    test('uses existing error message when reason not provided', async () => {
      await controller.__test__.scheduleRetry(transaction, 1);
      expect(StripeTransaction.updateStatus).toHaveBeenCalledWith(
        'txn_1',
        'requires_payment_method',
        'Last failure'
      );
    });
  });
});
