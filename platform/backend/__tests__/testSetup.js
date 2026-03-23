/**
 * testSetup.js
 * Creates a fresh in-memory SQLite database for each test suite.
 * Call setupTestDb() in beforeAll, teardownTestDb() in afterAll.
 */

process.env.NODE_ENV  = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
process.env.DB_PATH   = ':memory:';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Suppress email sending in tests
jest.mock('../utils/emailService', () => ({
  sendWelcomeEmail:           jest.fn(),
  sendPaymentReceipt:         jest.fn(),
  sendSubscriptionWarning:    jest.fn(),
  sendCertificateEmail:       jest.fn(),
  sendFeedbackNotification:   jest.fn(),
  sendEmail:                  jest.fn(),
}));

// Suppress MoMo API calls in tests
jest.mock('../utils/momoService', () => ({
  requestPayment:    jest.fn().mockResolvedValue({ referenceId: 'test-ref-id', amountRWF: 13000, amountUSD: 10 }),
  checkPaymentStatus: jest.fn().mockResolvedValue({ status: 'SUCCESSFUL' }),
  toRWF:             (usd) => usd * 1300,
}));

const sequelize = require('../config/database');

// Import all models to register them
require('../models/User');
require('../models/Payment');
require('../models/LearningModule');
require('../models/index');

const setupTestDb = async () => {
  await sequelize.sync({ force: true });
};

const teardownTestDb = async () => {
  await sequelize.close();
};

module.exports = { setupTestDb, teardownTestDb };
