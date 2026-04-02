const { setupTestDb, teardownTestDb } = require('./testSetup');
const User = require('../models/User');
const { runSubscriptionCron } = require('../utils/subscriptionCron');
const bcrypt = require('bcryptjs');

describe('Subscription Cron', () => {
  beforeAll(setupTestDb);
  afterAll(teardownTestDb);

  const makeEmployer = async (overrides) => {
    const hash = await bcrypt.hash('Pass1234', 12);
    return User.create({
      name: 'Employer',
      password: hash,
      role: 'employer',
      isActive: true,
      organisation: 'TestOrg',
      ...overrides,
    });
  };

  it('suspends an employer whose subscription has expired', async () => {
    const expired = await makeEmployer({
      email: 'expired@test.com',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    });

    await runSubscriptionCron();

    const updated = await User.findByPk(expired.id);
    expect(updated.subscriptionStatus).toBe('suspended');
  });

  it('does NOT suspend an employer whose subscription is still active', async () => {
    const active = await makeEmployer({
      email: 'active@test.com',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    });

    await runSubscriptionCron();

    const updated = await User.findByPk(active.id);
    expect(updated.subscriptionStatus).toBe('active');
  });

  it('sends a warning email (calls mock) for employer expiring within 3 days', async () => {
    const { sendSubscriptionWarning } = require('../utils/emailService');
    sendSubscriptionWarning.mockClear();

    await makeEmployer({
      email: 'expiring-soon@test.com',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    });

    await runSubscriptionCron();

    expect(sendSubscriptionWarning).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'expiring-soon@test.com' }),
      expect.any(Number)
    );
  });

  it('does NOT send warning for employer with 10 days remaining', async () => {
    const { sendSubscriptionWarning } = require('../utils/emailService');
    sendSubscriptionWarning.mockClear();

    await makeEmployer({
      email: 'not-expiring@test.com',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    await runSubscriptionCron();

    const calls = sendSubscriptionWarning.mock.calls.filter(
      ([user]) => user.email === 'not-expiring@test.com'
    );
    expect(calls.length).toBe(0);
  });

  it('does NOT re-suspend an already suspended employer', async () => {
    const alreadySuspended = await makeEmployer({
      email: 'already-suspended@test.com',
      subscriptionStatus: 'suspended',
      subscriptionExpiresAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    await runSubscriptionCron();

    const updated = await User.findByPk(alreadySuspended.id);
    expect(updated.subscriptionStatus).toBe('suspended');
  });
});
