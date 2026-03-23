const express = require('express');
const router  = express.Router();
const { Portfolio, PortfolioItem, Certificate } = require('../models/index');
const { protect, restrictTo, requireEmployerSubscription } = require('../middleware/auth');
const User = require('../models/User');
const { Op } = require('sequelize');

// Browse portfolios with search + filter (employer — subscription required)
router.get('/', protect, requireEmployerSubscription, async (req, res) => {
  try {
    const { track, country, hasCertificate, search } = req.query;

    // Build learner filter
    const userWhere = { role: 'learner', isActive: true };
    if (track)   userWhere.learningPath = { [Op.like]: `%${track}%` };
    if (country) userWhere.country      = { [Op.like]: `%${country}%` };
    if (search)  userWhere[Op.or] = [
      { name:  { [Op.like]: `%${search}%` } },
      { expertise: { [Op.like]: `%${search}%` } },
    ];

    const learners = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'country', 'learningPath', 'skillLevel', 'bio', 'expertise', 'profilePhoto'],
    });

    const learnerIds = learners.map(l => l.id);

    // Optionally filter to only learners who have at least one certificate
    let filteredIds = learnerIds;
    if (hasCertificate === 'true') {
      const certs = await Certificate.findAll({
        where: { learnerId: { [Op.in]: learnerIds }, isValid: true },
        attributes: ['learnerId'],
      });
      filteredIds = [...new Set(certs.map(c => c.learnerId))];
    }

    const portfolios = await Portfolio.findAll({
      where: {
        learnerId: { [Op.in]: filteredIds },
        visibility: 'public',
      },
    });

    // Attach learner data to each portfolio
    const learnerById = Object.fromEntries(learners.map(l => [l.id, l]));
    const result = portfolios.map(p => ({
      ...p.toJSON(),
      learner: learnerById[p.learnerId] || null,
    }));

    return res.status(200).json({ portfolios: result, total: result.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not fetch portfolios.' });
  }
});

// Get a specific learner's portfolio by learnerId
router.get('/:learnerId', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { learnerId: req.params.learnerId } });
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });

    if (portfolio.visibility === 'private') {
      if (req.user.id !== req.params.learnerId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'This portfolio is private.' });
      }
    }

    if (req.user.role === 'employer') {
      await portfolio.update({ views: (portfolio.views || 0) + 1 });
    }

    const items = await PortfolioItem.findAll({ where: { portfolioId: portfolio.id } });
    return res.status(200).json({ portfolio, items });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch portfolio.' });
  }
});

// Learner: update their own portfolio
router.patch('/me', protect, restrictTo('learner'), async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { learnerId: req.user.id } });
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });

    const { visibility, bio, skills, githubUrl, linkedinUrl } = req.body;
    await portfolio.update({
      visibility:  visibility  ?? portfolio.visibility,
      bio:         bio         ?? portfolio.bio,
      skills:      skills      ? JSON.stringify(skills) : portfolio.skills,
      githubUrl:   githubUrl   ?? portfolio.githubUrl,
      linkedinUrl: linkedinUrl ?? portfolio.linkedinUrl,
    });

    return res.status(200).json({ message: 'Portfolio updated.', portfolio });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update portfolio.' });
  }
});

// Learner: add item to portfolio
router.post('/me/items', protect, restrictTo('learner'), async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { learnerId: req.user.id } });
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });
    const { itemType, itemId, title, description } = req.body;
    const item = await PortfolioItem.create({ portfolioId: portfolio.id, itemType, itemId, title, description });
    return res.status(201).json({ message: 'Item added.', item });
  } catch (err) {
    return res.status(500).json({ message: 'Could not add item.' });
  }
});

// Learner: remove item from portfolio
router.delete('/me/items/:itemId', protect, restrictTo('learner'), async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { learnerId: req.user.id } });
    await PortfolioItem.destroy({ where: { id: req.params.itemId, portfolioId: portfolio.id } });
    return res.status(200).json({ message: 'Item removed.' });
  } catch (err) {
    return res.status(500).json({ message: 'Could not remove item.' });
  }
});

module.exports = router;
