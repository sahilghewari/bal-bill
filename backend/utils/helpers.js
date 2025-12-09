const CustomerBalance = require('../models/CustomerBalance');

const applyPayment = async ({ customerId, amount }) => {
  if (!customerId || !amount) {
    throw new Error('customerId and amount are required');
  }
  const updated = await CustomerBalance.updateBalance(customerId, -Math.abs(amount));
  return { message: 'Payment applied', balance: updated.balance };
};

module.exports = {
  applyPayment,
};
