const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Portfolio } = require('../models/index');
const { sendWelcomeEmail } = require('../utils/emailService');
require('dotenv').config();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Register ───────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, organisation, expertise, country } = req.body;

   // Only these roles can self-register
    const allowedSelfRegister = ['learner', 'employer', 'mentor'];
    if (!allowedSelfRegister.includes(role)) {
      return res.status(400).json({ message: 'Admins are created by administrators only.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      phone: phone || null,
      organisation: role === 'employer' ? organisation : null,
      expertise: role === 'mentor' ? expertise : null,
      country: country || 'Rwanda',
      // Mentors start as inactive — admin must approve before they can log in
      isActive: role === 'mentor' ? false : true,
    });

    // Auto-create empty portfolio for learners
    if (role === 'learner') {
      await Portfolio.create({ learnerId: user.id });
    }

       // Send welcome email (non-blocking)
    sendWelcomeEmail(user);

    // Mentors need admin approval — do not issue a token yet
    if (role === 'mentor') {
      return res.status(201).json({
        message: 'Application submitted! Your mentor account is pending admin approval. You will be able to log in once approved.',
        pendingApproval: true,
      });
    }

    const token = signToken(user.id);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

// ── Login ──────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact support.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    const token = signToken(user.id);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

// ── Get current user ───────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch user.' });
  }
};

// ── Update profile ─────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, country, skillLevel, learningPath, expertise } = req.body;
    const user = req.user;

    await user.update({
      name: name || user.name,
      phone: phone || user.phone,
      bio: bio || user.bio,
      country: country || user.country,
      skillLevel: skillLevel || user.skillLevel,
      learningPath: learningPath || user.learningPath,
      expertise: expertise || user.expertise,
      profilePhoto: req.file ? `/uploads/photos/${req.file.filename}` : user.profilePhoto,
    });

    return res.status(200).json({ message: 'Profile updated.', user: sanitizeUser(user) });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Could not update profile.' });
  }
};

// ── Change password ────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashed });

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Could not change password.' });
  }
};

// ── Strip sensitive fields before sending to client ────
const sanitizeUser = (user) => {
  const { password, resetToken, resetTokenExpiry, ...safe } = user.toJSON();
  return safe;
};

module.exports = { register, login, getMe, updateProfile, changePassword };
