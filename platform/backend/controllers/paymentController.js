const Payment = require('../models/Payment');
const User = require('../models/User');
const { requestPayment, checkPaymentStatus } = require('../utils/momoService');
const { sendPaymentReceipt } = require('../utils/emailService');
require('dotenv').config();

const LEARNER_FEE_USD = parseFloat(process.env.LEARNER_REGISTRATION_FEE) || 10;
const EMPLOYER_FEE_USD = parseFloat(process.env.EMPLOYER_MONTHLY_FEE) || 20;

// ── Learner: initiate $10 one-time payment ─────────────
const initiateLearnerPayment = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'learner') {
      return res.status(400).json({ message: 'Only learners can make this payment.' });
    }
    if (user.hasPaidAccess) {
      return res.status(400).json({ message: 'You already have full course access.' });
    }

    const phone = req.body.phone || user.phone;
    if (!phone) {
      return res.status(400).json({ message: 'MTN Mobile Money phone number is required.' });
    }

    const { referenceId, amountRWF } = await requestPayment(
      phone,
      LEARNER_FEE_USD,
      'ALU Platform – Course Access Fee',
      `Learner access for ${user.name}`
    );

    // Record the pending payment
    const payment = await Payment.create({
      userId: user.id,
      type: 'learner_access',
      amount: amountRWF,
      currency: 'RWF',
      amountUSD: LEARNER_FEE_USD,
      phone,
      momoReferenceId: referenceId,
      status: 'pending',
    });

    return res.status(202).json({
      message: 'Payment request sent to your phone. Please approve the MTN MoMo prompt.',
      paymentId: payment.id,
      referenceId,
      amountRWF,
      amountUSD: LEARNER_FEE_USD,
      checkStatusIn: 10, // seconds before client should poll
    });
  } catch (err) {
    console.error('Learner payment init error:', err);
    return res.status(500).json({ message: 'Failed to initiate payment. Please try again.' });
  }
};

// ── Employer: initiate $20/month subscription payment ──
const initiateEmployerPayment = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'employer') {
      return res.status(400).json({ message: 'Only employers can make this payment.' });
    }

    const phone = req.body.phone || user.phone;
    if (!phone) {
      return res.status(400).json({ message: 'MTN Mobile Money phone number is required.' });
    }

    const now = new Date();
    const periodStart = now;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Count existing payments to determine subscription month number
    const existing = await Payment.count({ where: { userId: user.id, type: 'employer_subscription', status: 'successful' } });
    const subscriptionMonth = existing + 1;

    const { referenceId, amountRWF } = await requestPayment(
      phone,
      EMPLOYER_FEE_USD,
      `ALU Platform – Employer Subscription (Month ${subscriptionMonth})`,
      `Employer subscription for ${user.name} / ${user.organisation}`
    );

    const payment = await Payment.create({
      userId: user.id,
      type: 'employer_subscription',
      amount: amountRWF,
      currency: 'RWF',
      amountUSD: EMPLOYER_FEE_USD,
      phone,
      momoReferenceId: referenceId,
      status: 'pending',
      subscriptionMonth,
      periodStart,
      periodEnd,
    });

    return res.status(202).json({
      message: 'Payment request sent to your phone. Please approve the MTN MoMo prompt.',
      paymentId: payment.id,
      referenceId,
      amountRWF,
      amountUSD: EMPLOYER_FEE_USD,
      periodStart,
      periodEnd,
      checkStatusIn: 10,
    });
  } catch (err) {
    console.error('Employer payment init error:', err);
    return res.status(500).json({ message: 'Failed to initiate payment. Please try again.' });
  }
};

// ── Poll payment status (client calls this every ~5s) ──
const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      where: { id: paymentId, userId: req.user.id },
    });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }
    if (payment.status === 'successful') {
      return res.status(200).json({ status: 'successful', payment });
    }
    if (payment.status === 'failed') {
      return res.status(200).json({ status: 'failed', reason: payment.failureReason });
    }

    // Check with MTN MoMo API
    const result = await checkPaymentStatus(payment.momoReferenceId);

    if (result.status === 'SUCCESSFUL') {
      await payment.update({ status: 'successful', paidAt: new Date() });

      const user = await User.findByPk(payment.userId);

      if (payment.type === 'learner_access') {
        await user.update({ hasPaidAccess: true });
      } else if (payment.type === 'employer_subscription') {
        await user.update({
          subscriptionStatus: 'active',
          subscriptionExpiresAt: payment.periodEnd,
          isEmployerVerified: true,
        });
        await payment.update({ periodEnd: payment.periodEnd });
      }

      // Send receipt email
      await payment.update({ receiptSent: true });
      sendPaymentReceipt(user, payment);

      return res.status(200).json({
        status: 'successful',
        message: payment.type === 'learner_access'
          ? 'Payment confirmed. You now have full access to all courses!'
          : `Subscription activated until ${payment.periodEnd.toLocaleDateString()}.`,
        payment,
      });
    }

    if (result.status === 'FAILED') {
      await payment.update({ status: 'failed', failureReason: result.reason || 'MTN MoMo payment declined.' });
      return res.status(200).json({ status: 'failed', reason: result.reason });
    }

    // Still pending
    return res.status(200).json({ status: 'pending', message: 'Waiting for MTN MoMo approval.' });
  } catch (err) {
    console.error('Payment verify error:', err);
    return res.status(500).json({ message: 'Could not verify payment status.' });
  }
};

// ── MTN MoMo webhook callback (server-to-server) ───────
const momoCallback = async (req, res) => {
  try {
    const { referenceId, status, reason } = req.body;
    const payment = await Payment.findOne({ where: { momoReferenceId: referenceId } });
    if (!payment) return res.status(200).send('OK'); // ignore unknown refs

    if (status === 'SUCCESSFUL' && payment.status !== 'successful') {
      await payment.update({ status: 'successful', paidAt: new Date() });
      const user = await User.findByPk(payment.userId);

      if (payment.type === 'learner_access') {
        await user.update({ hasPaidAccess: true });
      } else if (payment.type === 'employer_subscription') {
        await user.update({ subscriptionStatus: 'active', subscriptionExpiresAt: payment.periodEnd });
      }
      sendPaymentReceipt(user, payment);
    } else if (status === 'FAILED') {
      await payment.update({ status: 'failed', failureReason: reason || 'Declined.' });
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('MoMo callback error:', err);
    return res.status(500).send('Error');
  }
};

// ── Get my payment history ─────────────────────────────
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ payments });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch payment history.' });
  }
};

module.exports = {
  initiateLearnerPayment,
  initiateEmployerPayment,
  verifyPayment,
  momoCallback,
  getMyPayments,
};
