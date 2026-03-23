const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

// ── Verify token and attach user to request ────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorised. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or account deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// ── Role-based access control ──────────────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. This route is restricted to: ${roles.join(', ')}.`,
    });
  }
  next();
};

// ── Learner must have paid $10 to access courses ───────
const requireCourseAccess = (req, res, next) => {
  if (req.user.role === 'learner' && !req.user.hasPaidAccess) {
    return res.status(402).json({
      message: 'Payment required.',
      reason: 'course_access',
      fee: 10,
      currency: 'USD',
      detail: 'A one-time fee of $10 via MTN Mobile Money is required to access courses.',
    });
  }
  next();
};

// ── Employer must have active subscription ─────────────
const requireEmployerSubscription = (req, res, next) => {
  if (req.user.role === 'employer') {
    const now = new Date();
    const isActive =
      req.user.subscriptionStatus === 'active' &&
      req.user.subscriptionExpiresAt &&
      new Date(req.user.subscriptionExpiresAt) > now;

    if (!isActive) {
      return res.status(402).json({
        message: 'Subscription required.',
        reason: 'employer_subscription',
        fee: 20,
        currency: 'USD',
        detail: 'An active monthly subscription of $20 via MTN Mobile Money is required to browse talent profiles.',
      });
    }
  }
  next();
};

module.exports = { protect, restrictTo, requireCourseAccess, requireEmployerSubscription };
