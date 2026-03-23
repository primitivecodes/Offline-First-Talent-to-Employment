const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { MentorshipSession } = require('../models/index');

// ── Mentor: schedule a session ─────────────────────────
router.post('/', protect, restrictTo('mentor'), async (req, res) => {
  try {
    const { learnerId, scheduledAt, durationMinutes, meetingLink } = req.body;
    if (!learnerId || !scheduledAt) {
      return res.status(400).json({ message: 'learnerId and scheduledAt are required.' });
    }
    const session = await MentorshipSession.create({
      mentorId: req.user.id,
      learnerId,
      scheduledAt,
      durationMinutes: durationMinutes || 60,
      meetingLink: meetingLink || null,
    });
    return res.status(201).json({ message: 'Session scheduled.', session });
  } catch (err) {
    return res.status(500).json({ message: 'Could not schedule session.' });
  }
});

// ── Get sessions for the logged-in user ────────────────
router.get('/', protect, async (req, res) => {
  try {
    const where = req.user.role === 'mentor'
      ? { mentorId:  req.user.id }
      : { learnerId: req.user.id };
    const sessions = await MentorshipSession.findAll({
      where,
      order: [['scheduledAt', 'DESC']],
    });
    return res.status(200).json({ sessions });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch sessions.' });
  }
});

// ── Mentor: complete session with notes ────────────────
router.patch('/:id/complete', protect, restrictTo('mentor'), async (req, res) => {
  try {
    const session = await MentorshipSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    if (session.mentorId !== req.user.id) return res.status(403).json({ message: 'Not your session.' });
    await session.update({ status: 'completed', notes: req.body.notes || session.notes });
    return res.status(200).json({ message: 'Session marked as complete.', session });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update session.' });
  }
});

// ── Cancel a session ───────────────────────────────────
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const session = await MentorshipSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    const isOwner = session.mentorId === req.user.id || session.learnerId === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied.' });
    await session.update({ status: 'cancelled' });
    return res.status(200).json({ message: 'Session cancelled.' });
  } catch (err) {
    return res.status(500).json({ message: 'Could not cancel session.' });
  }
});

module.exports = router;
