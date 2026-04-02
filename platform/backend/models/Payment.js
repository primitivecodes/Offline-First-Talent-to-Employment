const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('learner_access', 'employer_subscription'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'RWF',
  },
  amountUSD: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'USD equivalent for records',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'MTN MoMo phone number used for payment',
  },
  momoReferenceId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'UUID reference sent to MTN MoMo API',
  },
  momoExternalId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'successful', 'failed', 'cancelled'),
    defaultValue: 'pending',
  },
  failureReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  receiptSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // For employer subscriptions
  subscriptionMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Which billing month this covers (1, 2, 3...)',
  },
  periodStart: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  periodEnd: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = Payment;
