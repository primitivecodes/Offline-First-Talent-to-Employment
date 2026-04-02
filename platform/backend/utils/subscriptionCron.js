const User = require('../models/User');
const { sendSubscriptionWarning } = require('./emailService');
const { Op } = require('sequelize');

/**
 * Run this once per day (called from server.js on a 24h interval).
 * 1. Suspends employers whose subscription has expired.
 * 2. Sends 3-day warning emails to employers expiring soon.
 */
const runSubscriptionCron = async () => {
  console.log('[CRON] Running subscription check...');
  const now = new Date();

  try {
    // ── 1. Suspend expired employers ──────────────────
    const expired = await User.findAll({
      where: {
        role: 'employer',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: { [Op.lt]: now },
      },
    });

    for (const employer of expired) {
      await employer.update({ subscriptionStatus: 'suspended' });
      console.log(`[CRON] Suspended employer: ${employer.email}`);
    }

    // ── 2. Warn employers expiring in 3 days ──────────
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoon = await User.findAll({
      where: {
        role: 'employer',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: {
          [Op.gt]: now,
          [Op.lt]: in3Days,
        },
      },
    });

    for (const employer of expiringSoon) {
      const msLeft   = new Date(employer.subscriptionExpiresAt) - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      sendSubscriptionWarning(employer, daysLeft);
      console.log(`[CRON] Warned ${employer.email} — expires in ${daysLeft} day(s)`);
    }

    console.log(`[CRON] Done. Suspended: ${expired.length}, Warned: ${expiringSoon.length}`);
  } catch (err) {
    console.error('[CRON] Subscription check failed:', err.message);
  }
};

module.exports = { runSubscriptionCron };
