const express = require('express');
const router  = express.Router();
const { Message } = require('../models/index');
const { protect } = require('../middleware/auth');
const { validate, messageRules } = require('../middleware/validators');
const User = require('../models/User');
const { Op } = require('sequelize');

// Contacts list
router.get('/contacts', protect, async (req, res) => {
  try {
    const sent     = await Message.findAll({ where: { senderId: req.user.id },   attributes: ['receiverId'] });
    const received = await Message.findAll({ where: { receiverId: req.user.id }, attributes: ['senderId'] });
    const ids = new Set([...sent.map(m => m.receiverId), ...received.map(m => m.senderId)]);
    ids.delete(req.user.id);
    if (ids.size === 0) return res.status(200).json({ contacts: [] });
    const contacts = await User.findAll({
      where: { id: Array.from(ids) },
      attributes: ['id', 'name', 'role', 'profilePhoto'],
    });
    return res.status(200).json({ contacts });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch contacts.' });
  }
});

// Conversation with a user
router.get('/:userId', protect, async (req, res) => {
  try {
    const msgs = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.user.id },
        ],
      },
      order: [['sentAt', 'ASC']],
    });
    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { senderId: req.params.userId, receiverId: req.user.id, isRead: false } }
    );
    return res.status(200).json({ messages: msgs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch messages.' });
  }
});

// Send a message
router.post('/', protect, messageRules, validate, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const msg = await Message.create({ senderId: req.user.id, receiverId, content: content.trim() });
    return res.status(201).json({ message: 'Message sent.', msg });
  } catch (err) {
    return res.status(500).json({ message: 'Could not send message.' });
  }
});

module.exports = router;
