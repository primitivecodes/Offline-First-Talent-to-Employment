const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const { Certificate } = require('../models/index');

// Get a user's public profile by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'role', 'email', 'expertise', 'skillLevel',
                   'learningPath', 'country', 'bio', 'profilePhoto', 'organisation',
                   'isActive', 'createdAt'],
    });
    if (!user || !user.isActive) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch user.' });
  }
});

// Get all mentors (for learners to pick from)
router.get('/', protect, async (req, res) => {
  try {
    const where = { isActive: true };
    if (req.query.role) where.role = req.query.role;
    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'role', 'expertise', 'skillLevel', 'country', 'bio', 'profilePhoto'],
    });
    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch users.' });
  }
});

// Get certificates for a specific learner (for portfolio page)
router.get('/:id/certificates', protect, async (req, res) => {
  try {
    const certs = await Certificate.findAll({
      where: { learnerId: req.params.id, isValid: true },
      order: [['issuedAt', 'DESC']],
    });
    return res.status(200).json({ certificates: certs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch certificates.' });
  }
});

module.exports = router;
