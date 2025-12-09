const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  req.validatedBody = value;
  return next();
};

const validateCustomer = validate(
  Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    accountNumber: Joi.string().required(),
  })
);

const validateRateCard = validate(
  Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    ratePerMinute: Joi.number().positive().required(),
  })
);

const validateCdr = validate(
  Joi.object({
    customerId: Joi.number().integer().required(),
    destination: Joi.string().required(),
    durationSeconds: Joi.number().integer().positive().required(),
    rateCardId: Joi.number().integer().required(),
  })
);

module.exports = {
  validateCustomer,
  validateRateCard,
  validateCdr,
};
