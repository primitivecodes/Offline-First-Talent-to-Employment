const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { Certificate, Submission, ProgressReport } = require('../models/index');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ── Get all users ──────────────────────────────────────
router.get('/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;
    const users = await User.findAll({
      where,
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch users.' });
  }
});

// ── Create mentor or admin account ────────────────────
router.post('/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, email, password, role, expertise } = req.body;
    if (!['mentor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Admins can only create mentor or admin accounts this way.' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use.' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, role, expertise, isActive: true });
    return res.status(201).json({ message: `${role} account created.`, user });
  } catch (err) {
    return res.status(500).json({ message: 'Could not create user.' });
  }
});

// ── Toggle user active/inactive ───────────────────────
router.patch('/users/:id/toggle-active', protect, restrictTo('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await user.update({ isActive: !user.isActive });
    return res.status(200).json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, user });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update user.' });
  }
});

// ── Verify employer manually ──────────────────────────
router.patch('/users/:id/verify-employer', protect, restrictTo('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || user.role !== 'employer') return res.status(404).json({ message: 'Employer not found.' });
    await user.update({ isEmployerVerified: true });
    return res.status(200).json({ message: 'Employer verified.', user });
  } catch (err) {
    return res.status(500).json({ message: 'Could not verify employer.' });
  }
});

// ── Platform revenue summary ──────────────────────────
router.get('/revenue', protect, restrictTo('admin'), async (req, res) => {
  try {
    const allPayments = await Payment.findAll({ where: { status: 'successful' } });
    const totalUSD = allPayments.reduce((sum, p) => sum + p.amountUSD, 0);
    const learnerPayments = allPayments.filter((p) => p.type === 'learner_access');
    const employerPayments = allPayments.filter((p) => p.type === 'employer_subscription');

    return res.status(200).json({
      totalRevenueUSD: totalUSD,
      learnerAccessRevenue: learnerPayments.reduce((s, p) => s + p.amountUSD, 0),
      employerSubscriptionRevenue: employerPayments.reduce((s, p) => s + p.amountUSD, 0),
      totalTransactions: allPayments.length,
      learnerTransactions: learnerPayments.length,
      employerTransactions: employerPayments.length,
      recentPayments: allPayments.slice(-10).reverse(),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch revenue data.' });
  }
});

// ── Admin manually issues certificate ─────────────────
router.post('/certificates', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { learnerId, moduleId, skillArea } = req.body;
    const cert = await Certificate.create({
      learnerId,
      moduleId,
      skillArea,
      verificationCode: uuidv4().slice(0, 8).toUpperCase(),
      isValid: true,
    });
    const learner = await User.findByPk(learnerId);
    if (learner) {
      const { sendCertificateEmail } = require('../utils/emailService');
      sendCertificateEmail(learner, cert);
    }
    return res.status(201).json({ message: 'Certificate issued.', certificate: cert });
  } catch (err) {
    return res.status(500).json({ message: 'Could not issue certificate.' });
  }
});

// ── Platform stats dashboard ──────────────────────────
router.get('/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const [learners, mentors, employers, submissions, certs] = await Promise.all([
      User.count({ where: { role: 'learner' } }),
      User.count({ where: { role: 'mentor' } }),
      User.count({ where: { role: 'employer' } }),
      Submission.count(),
      Certificate.count(),
    ]);
    return res.status(200).json({ learners, mentors, employers, submissions, certificates: certs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch stats.' });
  }
});

module.exports = router;
