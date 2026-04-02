const express = require('express');
const router  = express.Router();
const { Certificate } = require('../models/index');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

// PUBLIC: verify by code (NO auth) — MUST be before /:id
router.get('/verify/:code', async (req, res) => {
  try {
    const cert = await Certificate.findOne({ where: { verificationCode: req.params.code } });
    if (!cert) return res.status(404).json({ message: 'Certificate not found.' });
    const learner = await User.findByPk(cert.learnerId, { attributes: ['id', 'name', 'country'] });
    return res.status(200).json({ certificate: cert, learner });
  } catch (err) {
    return res.status(500).json({ message: 'Could not verify certificate.' });
  }
});

// Learner/admin/employer: get certificates (supports ?learnerId=)
router.get('/', protect, async (req, res) => {
  try {
    const learnerId = req.query.learnerId || req.user.id;
    if (req.user.role === 'learner' && learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const certs = await Certificate.findAll({ where: { learnerId }, order: [['issuedAt', 'DESC']] });
    return res.status(200).json({ certificates: certs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch certificates.' });
  }
});

// Get single certificate by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const cert = await Certificate.findByPk(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found.' });
    if (req.user.role === 'learner' && cert.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const learner = await User.findByPk(cert.learnerId, { attributes: ['id', 'name', 'email', 'country'] });
    return res.status(200).json({ certificate: cert, learner });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch certificate.' });
  }
});

// Admin: revoke
router.patch('/:id/revoke', protect, restrictTo('admin'), async (req, res) => {
  try {
    const cert = await Certificate.findByPk(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Not found.' });
    await cert.update({ isValid: false });
    return res.status(200).json({ message: 'Certificate revoked.' });
  } catch (err) {
    return res.status(500).json({ message: 'Could not revoke.' });
  }
});

module.exports = router;
