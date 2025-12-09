const stripe = require('../config/stripe');
const Invoice = require('../models/Invoice');
const StripeTransaction = require('../models/StripeTransaction');
const Customer = require('../models/Customer');
const CustomerBalance = require('../models/CustomerBalance');
const logger = require('../middleware/logger');

exports.createPaymentIntent = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const { payment_method_id } = req.body;

    const invoice = await Invoice.getById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const customer = await Customer.getById(invoice.customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const amountInCents = Math.round(parseFloat(invoice.total_amount) * 100);

    let stripeCustomerId;
    try {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
        metadata: { customer_id: invoice.customer_id },
      });
      stripeCustomerId = stripeCustomer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer', { error: error.message });
      return res.status(500).json({
        error: 'Failed to create Stripe customer',
        details: error.message,
      });
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: customer.currency.toLowerCase(),
        customer: stripeCustomerId,
        payment_method: payment_method_id || undefined,
        confirm: Boolean(payment_method_id),
        metadata: {
          invoice_id,
          customer_id: invoice.customer_id,
          invoice_number: invoice.invoice_number,
        },
      });
    } catch (error) {
      logger.error('Failed to create payment intent', { error: error.message });
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
      payment_method: payment_method_id || null,
    });

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
    res.status(500).json({
      error: 'Failed to create payment intent',
      details: error.message,
    });
  }
};

exports.confirmPaymentIntent = async (req, res) => {
  try {
    const { payment_intent_id } = req.params;
    const { payment_method_id } = req.body;

    if (!payment_method_id) {
      return res.status(400).json({ error: 'payment_method_id is required' });
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.confirm(payment_intent_id, {
        payment_method: payment_method_id,
      });
    } catch (error) {
      logger.error('Failed to confirm payment intent', { error: error.message });
      return res.status(400).json({
        error: 'Failed to confirm payment',
        details: error.message,
      });
    }

    const transaction = await StripeTransaction.getByPaymentIntentId(payment_intent_id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
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
    res.status(500).json({
      error: 'Failed to confirm payment',
      details: error.message,
    });
  }
};

exports.getPaymentIntentStatus = async (req, res) => {
  try {
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
        created_at: new Date(paymentIntent.created * 1000),
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve payment intent status', { error: error.message });
    res.status(500).json({
      error: 'Failed to get payment intent status',
      details: error.message,
    });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const customer = await Customer.getById(customer_id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const latestTransaction = await StripeTransaction.getByCustomer(customer_id, 1, 1);
    if (!latestTransaction.transactions.length) {
      return res.json({
        success: true,
        data: {
          customer_id,
          payment_methods: [],
          message: 'No payment methods found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        customer_id,
        payment_methods: [],
        message: 'Payment methods list coming soon',
      },
    });
  } catch (error) {
    logger.error('Failed to fetch payment methods', { error: error.message });
    res.status(500).json({
      error: 'Failed to get payment methods',
      details: error.message,
    });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
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

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook processing failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

exports.retryFailedPayments = async (req, res) => {
  try {
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

        if (paymentIntent.status === 'requires_payment_method') {
          try {
            const retried = await stripe.paymentIntents.confirm(paymentIntent.id);
            if (retried.status === 'succeeded') {
              succeeded += 1;
              await StripeTransaction.updateStatus(transaction.id, 'succeeded');
              await finalizeSuccessfulPayment(transaction);
            } else {
              failed += 1;
              const nextRetryTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
              await StripeTransaction.setRetry(
                transaction.id,
                (transaction.retry_count || 0) + 1,
                nextRetryTime
              );
            }
          } catch (retryError) {
            failed += 1;
            logger.error('Stripe retry failed', {
              transaction_id: transaction.id,
              error: retryError.message,
            });
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

  const nextRetryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await StripeTransaction.setRetry(transaction.id, (transaction.retry_count || 0) + 1, nextRetryTime);

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
