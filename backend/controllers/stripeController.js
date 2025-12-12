const getStripeClient = require('../config/stripe');
const Invoice = require('../models/Invoice');
const StripeTransaction = require('../models/StripeTransaction');
const Customer = require('../models/Customer');
const CustomerBalance = require('../models/CustomerBalance');
const logger = require('../middleware/logger');

const FALLBACK_RETRY_DELAY_HOURS = 24;
const MAX_RETRY_ATTEMPTS = 3;

const PAYMENT_INTENT_TERMINAL_STATES = new Set(['succeeded', 'canceled']);
const PAYMENT_INTENT_ACTIONABLE_STATES = new Set([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
]);

const handledEvents = new Set();
const getWebhookEventKey = (event) => `${event.id}-${event.type}`;

const getIdempotencyKey = (req, fallback) => {
  const headerKey = req.headers['idempotency-key'];
  if (headerKey && typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  return fallback;
};

const ensureStripeCustomer = async (customer) => {
  if (customer.stripe_customer_id) {
    return customer.stripe_customer_id;
  }

  try {
    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const existing = await stripe.customers.list({ email: customer.email, limit: 1 });
    if (existing.data.length) {
      await Customer.update(customer.id, { stripe_customer_id: existing.data[0].id });
      return existing.data[0].id;
    }
  } catch (lookupError) {
    logger.warn('Failed to search existing Stripe customers by email', {
      customer_id: customer.id,
      error: lookupError.message,
    });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const stripeCustomer = await stripe.customers.create(
    {
      email: customer.email,
      name: customer.name,
      metadata: { customer_id: customer.id },
    },
    {
      idempotencyKey: `customer_${customer.id}`,
    }
  );

  await Customer.update(customer.id, { stripe_customer_id: stripeCustomer.id });
  return stripeCustomer.id;
};

const tryAttachPaymentMethod = async (stripeCustomerId, paymentMethodId, customerId) => {
  if (!paymentMethodId) {
    return null;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return null;
  }

  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    logger.info('Stripe payment method attached to customer', {
      customer_id: customerId,
      stripe_customer_id: stripeCustomerId,
      payment_method: paymentMethodId,
    });

    return paymentMethod;
  } catch (attachError) {
    logger.error('Failed to attach payment method to customer', {
      customer_id: customerId,
      stripe_customer_id: stripeCustomerId,
      payment_method: paymentMethodId,
      error: attachError.message,
    });
    throw attachError;
  }
};

const getDefaultPaymentMethod = (customer) => {
  if (customer.stripe_default_payment_method && customer.stripe_default_payment_method.trim()) {
    return customer.stripe_default_payment_method.trim();
  }

  return null;
};

const scheduleRetry = async (transaction, delayHours, status = 'requires_payment_method', reason = null) => {
  const nextRetryTime = new Date(Date.now() + delayHours * 60 * 60 * 1000);
  await StripeTransaction.setRetry(
    transaction.id,
    (transaction.retry_count || 0) + 1,
    nextRetryTime
  );

  if (status) {
    await StripeTransaction.updateStatus(transaction.id, status, reason || transaction.error_message);
  }
};

const resolveDefaultPaymentMethod = async (customer, stripeCustomerId) => {
  const storedMethod = getDefaultPaymentMethod(customer);
  if (storedMethod) {
    return storedMethod;
  }

  if (!stripeCustomerId) {
    return null;
  }

  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return null;
    }

    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ['invoice_settings.default_payment_method'],
    });

    const defaultPaymentMethod =
      stripeCustomer.invoice_settings?.default_payment_method
      || stripeCustomer.default_payment_method
      || stripeCustomer.invoice_settings?.default_payment_method?.id
      || stripeCustomer.default_payment_method?.id;

    if (defaultPaymentMethod) {
      const paymentMethodId =
        typeof defaultPaymentMethod === 'string'
          ? defaultPaymentMethod
          : defaultPaymentMethod.id;

      await Customer.update(customer.id, {
        stripe_default_payment_method: paymentMethodId,
      });

      return paymentMethodId;
    }
  } catch (lookupError) {
    logger.warn('Failed to retrieve Stripe customer default payment method', {
      customer_id: customer.id,
      stripe_customer_id: stripeCustomerId,
      error: lookupError.message,
    });
  }

  return null;
};

const buildPaymentIntentParams = ({
  amountInCents,
  currency,
  stripeCustomerId,
  paymentMethodId,
  invoice,
}) => {
  const params = {
    amount: amountInCents,
    currency,
    customer: stripeCustomerId,
    metadata: {
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      invoice_number: invoice.invoice_number,
    },
    description: `Invoice ${invoice.invoice_number}`,
  };

  if (paymentMethodId) {
    params.payment_method = paymentMethodId;
    params.confirm = true;
    params.off_session = true;
  }

  return params;
};

exports.createPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe integration not configured' });
    }

    const { invoice_id } = req.params;
    const { payment_method_id } = req.body || {};

    const invoice = await Invoice.getById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const customer = await Customer.getById(invoice.customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const amountInCents = Math.round(parseFloat(invoice.total_amount) * 100);
    const stripeCustomerId = await ensureStripeCustomer(customer);

    const incomingPaymentMethodId = typeof payment_method_id === 'string' ? payment_method_id.trim() : null;
    const fallbackPaymentMethodId = await resolveDefaultPaymentMethod(customer, stripeCustomerId);

    let resolvedPaymentMethodId = incomingPaymentMethodId || fallbackPaymentMethodId;

    if (incomingPaymentMethodId) {
      await tryAttachPaymentMethod(stripeCustomerId, incomingPaymentMethodId, customer.id);
      resolvedPaymentMethodId = incomingPaymentMethodId;
    }

    const params = buildPaymentIntentParams({
      amountInCents,
      currency: customer.currency.toLowerCase(),
      stripeCustomerId,
      paymentMethodId: resolvedPaymentMethodId,
      invoice,
    });

    let paymentIntent;
    try {
      const idempotencyKey = getIdempotencyKey(req, `pi_${invoice.id}`);
      paymentIntent = await stripe.paymentIntents.create(params, { idempotencyKey });
    } catch (error) {
      logger.error('Failed to create payment intent', {
        invoice_id,
        customer_id: invoice.customer_id,
        error: error.message,
      });
      return res.status(400).json({
        error: 'Failed to create payment intent',
        details: error.message,
      });
    }

    await StripeTransaction.create({
      customer_id: invoice.customer_id,
      invoice_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: parseFloat(invoice.total_amount),
      currency: customer.currency,
      status: paymentIntent.status,
      payment_method: resolvedPaymentMethodId,
      stripe_customer_id: stripeCustomerId,
    });

    if (resolvedPaymentMethodId && resolvedPaymentMethodId !== customer.stripe_default_payment_method) {
      await Customer.update(customer.id, { stripe_default_payment_method: resolvedPaymentMethodId });
    }

    logger.info('Stripe payment intent created', {
      payment_intent_id: paymentIntent.id,
      customer_id: invoice.customer_id,
      amount: invoice.total_amount,
    });

    res.status(201).json({
      success: true,
      message: 'Payment intent created',
      data: {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount: parseFloat(invoice.total_amount),
        currency: customer.currency,
        invoice_id,
      },
    });
  } catch (error) {
    logger.error('Unexpected error creating payment intent', { error: error.message });
    res.status(500).json({ error: 'Failed to create payment intent', details: error.message });
  }
};

exports.confirmPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe integration not configured' });
    }

    const { payment_intent_id } = req.params;
    const { payment_method_id } = req.body || {};

    let paymentIntent;
    try {
      const confirmParams = {};
      if (payment_method_id) {
        confirmParams.payment_method = payment_method_id;
      }

      const idempotencyKey = getIdempotencyKey(req, `pi_confirm_${payment_intent_id}`);
      paymentIntent = await stripe.paymentIntents.confirm(payment_intent_id, confirmParams, {
        idempotencyKey,
      });
    } catch (error) {
      logger.error('Failed to confirm payment intent', {
        payment_intent_id,
        error: error.message,
      });
      return res.status(400).json({ error: 'Failed to confirm payment', details: error.message });
    }

    const transaction = await StripeTransaction.getByPaymentIntentId(payment_intent_id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (payment_method_id) {
      await Customer.update(transaction.customer_id, {
        stripe_default_payment_method: payment_method_id,
      });
    }

    await StripeTransaction.updateStatus(transaction.id, paymentIntent.status);

    if (paymentIntent.status === 'succeeded') {
      await finalizeSuccessfulPayment(transaction);
    }

    res.json({
      success: paymentIntent.status === 'succeeded',
      message: `Payment ${paymentIntent.status}`,
      data: {
        status: paymentIntent.status,
        payment_intent_id: paymentIntent.id,
        customer_id: transaction.customer_id,
        amount: transaction.amount,
      },
    });
  } catch (error) {
    logger.error('Unexpected error confirming payment intent', { error: error.message });
    res.status(500).json({ error: 'Failed to confirm payment', details: error.message });
  }
};

exports.getPaymentIntentStatus = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe integration not configured' });
    }

    const { payment_intent_id } = req.params;
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    const transaction = await StripeTransaction.getByPaymentIntentId(payment_intent_id);

    res.json({
      success: true,
      data: {
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        customer_id: transaction?.customer_id || null,
        invoice_id: transaction?.invoice_id || null,
        stripe_customer_id: transaction?.stripe_customer_id || null,
        created_at: new Date(paymentIntent.created * 1000),
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve payment intent status', { error: error.message });
    res.status(500).json({ error: 'Failed to get payment intent status', details: error.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe integration not configured' });
    }

    const { customer_id } = req.params;
    const customer = await Customer.getById(customer_id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const stripeCustomerId = await ensureStripeCustomer(customer);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    res.json({
      success: true,
      data: {
        customer_id,
        stripe_customer_id: stripeCustomerId,
        default_payment_method: customer.stripe_default_payment_method || null,
        payment_methods: paymentMethods.data,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch payment methods', { error: error.message });
    res.status(500).json({ error: 'Failed to get payment methods', details: error.message });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe integration not configured' });
    }

    const { customer_id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const customer = await Customer.getById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await StripeTransaction.getByCustomer(customer_id, page, limit);

    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit) || 1,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch transaction history', { error: error.message });
    res.status(500).json({
      error: 'Failed to get transaction history',
      details: error.message,
    });
  }
};

exports.handleWebhook = async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe integration not configured' });
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    logger.error('Stripe webhook signature verification failed', { error: error.message });
    return res.status(400).json({ error: 'Invalid Stripe signature' });
  }

  try {
    const eventKey = getWebhookEventKey(event);
    if (handledEvents.has(eventKey)) {
      logger.warn('Duplicate Stripe webhook ignored', { event_id: event.id, event_type: event.type });
      return res.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }

    handledEvents.add(eventKey);
    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

exports.retryFailedPayments = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe integration not configured' });
    }

    const failedTransactions = await StripeTransaction.getFailedForRetry();

    if (!failedTransactions.length) {
      return res.json({ success: true, message: 'No failed payments to retry', retried: 0 });
    }

    let succeeded = 0;
    let failed = 0;

    for (const transaction of failedTransactions) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          transaction.stripe_payment_intent_id
        );

        if (
          PAYMENT_INTENT_TERMINAL_STATES.has(paymentIntent.status)
          || transaction.retry_count >= MAX_RETRY_ATTEMPTS
        ) {
          if (paymentIntent.status === 'succeeded') {
            succeeded += 1;
            await StripeTransaction.updateStatus(transaction.id, 'succeeded');
            await finalizeSuccessfulPayment(transaction);
          } else {
            failed += 1;
            await StripeTransaction.updateStatus(transaction.id, paymentIntent.status);
          }
          continue;
        }

        if (paymentIntent.status === 'requires_payment_method') {
          try {
            const customer = await Customer.getById(transaction.customer_id);
            if (!customer) {
              throw new Error('Customer not found for transaction');
            }

            const stripeCustomerId = await ensureStripeCustomer(customer);
            const paymentMethodId = await resolveDefaultPaymentMethod(customer, stripeCustomerId);

            if (!paymentMethodId) {
              failed += 1;
              logger.warn('No default payment method found for retry', {
                transaction_id: transaction.id,
                customer_id: transaction.customer_id,
              });
              await scheduleRetry(
                transaction,
                FALLBACK_RETRY_DELAY_HOURS,
                'requires_payment_method',
                'No default payment method available'
              );
              continue;
            }

            await tryAttachPaymentMethod(stripeCustomerId, paymentMethodId, customer.id);

            const retried = await stripe.paymentIntents.confirm(paymentIntent.id, {
              payment_method: paymentMethodId,
              off_session: true,
            }, {
              idempotencyKey: `pi_retry_${paymentIntent.id}`,
            });

            if (retried.status === 'succeeded') {
              succeeded += 1;
              await StripeTransaction.updateStatus(transaction.id, 'succeeded');
              await finalizeSuccessfulPayment(transaction);
            } else {
              failed += 1;
              await scheduleRetry(
                transaction,
                FALLBACK_RETRY_DELAY_HOURS * 2,
                retried.status,
                'Retry did not succeed'
              );
            }
          } catch (retryError) {
            failed += 1;
            logger.error('Stripe retry failed', {
              transaction_id: transaction.id,
              error: retryError.message,
            });
            await scheduleRetry(
              transaction,
              FALLBACK_RETRY_DELAY_HOURS,
              transaction.status,
              retryError.message
            );
          }
        }
      } catch (retrieveError) {
        failed += 1;
        logger.error('Failed to retrieve payment intent during retry', {
          transaction_id: transaction.id,
          error: retrieveError.message,
        });
      }
    }

    res.json({
      success: true,
      message: 'Retry payment processing complete',
      retried: succeeded + failed,
      succeeded,
      failed,
    });
  } catch (error) {
    logger.error('Failed to retry Stripe payments', { error: error.message });
    res.status(500).json({
      error: 'Failed to retry payments',
      details: error.message,
    });
  }
};

async function finalizeSuccessfulPayment(transaction) {
  const invoice = await Invoice.getById(transaction.invoice_id);
  if (!invoice) {
    logger.warn('Stripe payment succeeded but invoice not found', {
      invoice_id: transaction.invoice_id,
    });
    return;
  }

  await Invoice.updatePayment(invoice.id, invoice.total_amount, new Date(), 'paid');

  const customer = await Customer.getById(invoice.customer_id);
  const currentBalance = parseFloat(customer.current_balance || 0);
  const newBalance = currentBalance + parseFloat(invoice.total_amount);

  await Customer.updateBalance(invoice.customer_id, newBalance);

  await CustomerBalance.recordTransaction({
    customer_id: invoice.customer_id,
    transaction_type: 'recharge',
    amount: parseFloat(invoice.total_amount),
    balance_before: currentBalance,
    balance_after: newBalance,
    reference_id: transaction.id,
    description: `Stripe payment received for invoice ${invoice.invoice_number}`,
  });

  logger.info('Stripe payment finalized', {
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    amount: invoice.total_amount,
  });
}

async function handlePaymentSucceeded(paymentIntent) {
  const transaction = await StripeTransaction.getByPaymentIntentId(paymentIntent.id);
  if (!transaction) {
    logger.warn('Stripe payment succeeded but transaction not found', {
      payment_intent_id: paymentIntent.id,
    });
    return;
  }

  await StripeTransaction.updateStatus(transaction.id, 'succeeded');
  await finalizeSuccessfulPayment(transaction);
}

async function handlePaymentFailed(paymentIntent) {
  const transaction = await StripeTransaction.getByPaymentIntentId(paymentIntent.id);
  if (!transaction) {
    logger.warn('Stripe payment failed but transaction not found', {
      payment_intent_id: paymentIntent.id,
    });
    return;
  }

  const errorMessage =
    paymentIntent.last_payment_error?.message || 'Payment failed - unknown reason';

  await StripeTransaction.updateStatus(transaction.id, 'failed', errorMessage);
  await scheduleRetry(
    transaction,
    FALLBACK_RETRY_DELAY_HOURS,
    'requires_payment_method',
    errorMessage
  );

  logger.warn('Stripe payment failed', {
    payment_intent_id: paymentIntent.id,
    customer_id: transaction.customer_id,
    error: errorMessage,
  });
}

async function handlePaymentCanceled(paymentIntent) {
  const transaction = await StripeTransaction.getByPaymentIntentId(paymentIntent.id);
  if (!transaction) {
    logger.warn('Stripe payment canceled but transaction not found', {
      payment_intent_id: paymentIntent.id,
    });
    return;
  }

  await StripeTransaction.updateStatus(transaction.id, 'canceled');

  logger.info('Stripe payment canceled', {
    payment_intent_id: paymentIntent.id,
    customer_id: transaction.customer_id,
  });
}

async function handleChargeRefunded(charge) {
  logger.info('Stripe charge refunded', {
    charge_id: charge.id,
    amount_refunded: charge.amount_refunded,
  });
}

exports.__test__ = {
  scheduleRetry,
  resolveDefaultPaymentMethod,
};
