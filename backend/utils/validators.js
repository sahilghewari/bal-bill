const Joi = require('joi');
const logger = require('../middleware/logger');

// Custom error messages
const customMessages = {
  'string.empty': '{#label} cannot be empty',
  'string.email': '{#label} must be a valid email',
  'number.base': '{#label} must be a number',
  'number.positive': '{#label} must be positive',
  'date.base': '{#label} must be a valid date',
  'any.required': '{#label} is required',
};

// Rate card validation
const rateCardSchema = Joi.object({
  customer_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  service_type: Joi.string().valid('DID', 'VIRTUAL_NUMBER').required(),
  initial_block_seconds: Joi.number().integer().min(1).max(3600).required(),
  next_block_seconds: Joi.number().integer().min(1).max(3600).required(),
  price_per_minute: Joi.number().positive().precision(6).required(),
  connection_fee_flat: Joi.number().min(0).precision(4).default(0),
  effective_date: Joi.date().iso().required(),
  currency: Joi.string().length(3).uppercase().optional(),
}).messages(customMessages);

// CDR validation
const cdrSchema = Joi.object({
  customer_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
  caller_id: Joi.string().min(1).max(50).required(),
  callee_id: Joi.string().min(1).max(50).required(),
  destination: Joi.string().max(100),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().required(),
  duration_seconds: Joi.number().integer().min(1).max(3600 * 24).required(),
  service_type: Joi.string().valid('DID', 'VIRTUAL_NUMBER').required(),
}).messages(customMessages);

// Customer validation
const customerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().regex(/^[+]?[0-9\s\-\(\)]{7,}$/).allow(''),
  country: Joi.string().min(2).max(50).required(),
  currency: Joi.string().valid('USD', 'CAD', 'PHP').required(),
  billing_day: Joi.number().integer().min(1).max(28).default(1),
}).messages(customMessages);

// Invoice validation
const invoiceSchema = Joi.object({
  billing_period_start: Joi.date().iso().required(),
  billing_period_end: Joi.date().iso().required(),
  due_date: Joi.date().iso(),
}).messages(customMessages);

// Payment validation
const paymentSchema = Joi.object({
  paid_amount: Joi.number().positive().precision(4).required(),
  payment_date: Joi.date().iso(),
}).messages(customMessages);

// Stripe payment intent validation
const paymentIntentSchema = Joi.object({
  payment_method_id: Joi.string().required(),
}).messages(customMessages);

// Balance adjustment validation
const balanceAdjustmentSchema = Joi.object({
  amount: Joi.number().required(),
  reason: Joi.string().min(5).max(255).required(),
}).messages(customMessages);

// Credit addition validation
const creditSchema = Joi.object({
  amount: Joi.number().positive().precision(4).required(),
  description: Joi.string().max(255),
}).messages(customMessages);

const validateWithSchema = (schema, data, label) => {
  const result = schema.validate(data, { abortEarly: false });

  if (result.error) {
    logger.warn('Validation failed', {
      schema: label,
      errors: result.error.details.map((detail) => detail.message),
    });
  }

  return result;
};

// Export validators
const validateRateCard = (data) => validateWithSchema(rateCardSchema, data, 'rateCard');

const validateCDR = (data) => validateWithSchema(cdrSchema, data, 'cdr');

const validateCustomer = (data) => validateWithSchema(customerSchema, data, 'customer');

const validateInvoice = (data) => validateWithSchema(invoiceSchema, data, 'invoice');

const validatePayment = (data) => validateWithSchema(paymentSchema, data, 'payment');

const validatePaymentIntent = (data) =>
  validateWithSchema(paymentIntentSchema, data, 'paymentIntent');

const validateBalanceAdjustment = (data) =>
  validateWithSchema(balanceAdjustmentSchema, data, 'balanceAdjustment');

const validateCredit = (data) => validateWithSchema(creditSchema, data, 'credit');

// Helper to format validation errors
const formatValidationErrors = (errors) => {
  return errors.details.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};

module.exports = {
  validateRateCard,
  validateCDR,
  validateCustomer,
  validateInvoice,
  validatePayment,
  validatePaymentIntent,
  validateBalanceAdjustment,
  validateCredit,
  formatValidationErrors,
};
