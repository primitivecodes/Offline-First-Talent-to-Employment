// ── routes/submissions.js ──────────────────────────────
const express = require('express');
const { protect, restrictTo, requireCourseAccess } = require('../middleware/auth');
const {
  Submission, Feedback, Certificate, Portfolio, PortfolioItem,
  Message, MentorshipSession, ProgressReport, LearnerModule, AssessmentAttempt, Assessment,
} = require('../models/index');
const LearningModule = require('../models/LearningModule');
const User = require('../models/User');
const { sendFeedbackNotification, sendCertificateEmail } = require('../utils/emailService');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const router = express.Router();
const upload = multer({
  dest: './uploads/submissions',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// ── SUBMISSIONS ────────────────────────────────────────

// Learner submits a project
router.post('/', protect, restrictTo('learner'), requireCourseAccess, upload.single('file'), async (req, res) => {
  try {
    const { moduleId, projectTitle, description, repoUrl } = req.body;
    const sub = await Submission.create({
      learnerId: req.user.id,
      moduleId,
      projectTitle,
      description,
      repoUrl,
      fileUrl: req.file ? `/uploads/submissions/${req.file.filename}` : null,
      status: 'submitted',
    });
    return res.status(201).json({ message: 'Project submitted successfully.', submission: sub });
  } catch (err) {
    return res.status(500).json({ message: 'Could not submit project.' });
  }
});

// Mentor / Admin: get submissions (filtered by status)
router.get('/', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.user.role === 'mentor') where.assignedMentorId = req.user.id;
    const subs = await Submission.findAll({ where, order: [['submittedAt', 'DESC']] });
    return res.status(200).json({ submissions: subs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch submissions.' });
  }
});

// Learner: get own submissions
router.get('/mine', protect, restrictTo('learner'), async (req, res) => {
  try {
    const subs = await Submission.findAll({
      where: { learnerId: req.user.id },
      order: [['submittedAt', 'DESC']],
    });
    return res.status(200).json({ submissions: subs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch your submissions.' });
  }
});

// ── FEEDBACK ───────────────────────────────────────────

// Mentor gives feedback on a submission
router.post('/:submissionId/feedback', protect, restrictTo('mentor'), async (req, res) => {
  try {
    const { content, rating } = req.body;
    const sub = await Submission.findByPk(req.params.submissionId);
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });

    const fb = await Feedback.create({
      submissionId: sub.id,
      mentorId: req.user.id,
      learnerId: sub.learnerId,
      content,
      rating: rating || null,
    });

    await sub.update({ status: 'reviewed', assignedMentorId: req.user.id });

    const learner = await User.findByPk(sub.learnerId);
    if (learner) sendFeedbackNotification(learner, req.user.name, sub.projectTitle);

    return res.status(201).json({ message: 'Feedback submitted.', feedback: fb });
  } catch (err) {
    return res.status(500).json({ message: 'Could not submit feedback.' });
  }
});

// Learner: get feedback on their submission
router.get('/:submissionId/feedback', protect, async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({ where: { submissionId: req.params.submissionId } });
    await Feedback.update({ isRead: true }, { where: { submissionId: req.params.submissionId, learnerId: req.user.id } });
    return res.status(200).json({ feedbacks });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch feedback.' });
  }
});

module.exports = router;

// ════════════════════════════════════════════════════════

// ── routes/portfolio.js ────────────────────────────────
const portfolioRouter = express.Router();

// Employer: browse public portfolios
portfolioRouter.get('/', protect, async (req, res) => {
  try {
    const portfolios = await Portfolio.findAll({
      where: { visibility: 'public' },
    });
    return res.status(200).json({ portfolios });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch portfolios.' });
  }
});

// Anyone authenticated: get a specific portfolio
portfolioRouter.get('/:learnerId', protect, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { learnerId: req.params.learnerId } });
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });
    if (req.user.role === 'employer') {
      await portfolio.update({ views: portfolio.views + 1 });
    }
    const items = await PortfolioItem.findAll({ where: { portfolioId: portfolio.id } });
    return res.status(200).json({ portfolio, items });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch portfolio.' });
  }
});

// Learner: update portfolio visibility / bio / links
portfolioRouter.patch('/me', protect, restrictTo('learner'), async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ where: { learnerId: req.user.id } });
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found.' });
    const { visibility, bio, skills, githubUrl, linkedinUrl } = req.body;
    await portfolio.update({ visibility, bio, skills: JSON.stringify(skills), githubUrl, linkedinUrl });
    return res.status(200).json({ message: 'Portfolio updated.', portfolio });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update portfolio.' });
  }
});

module.exports.portfolioRouter = portfolioRouter;

// ════════════════════════════════════════════════════════

// ── routes/messages.js ─────────────────────────────────
const messageRouter = express.Router();

// Send a message
messageRouter.post('/', protect, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const msg = await Message.create({ senderId: req.user.id, receiverId, content });
    return res.status(201).json({ message: 'Message sent.', msg });
  } catch (err) {
    return res.status(500).json({ message: 'Could not send message.' });
  }
});

// Get conversation with a specific user
messageRouter.get('/:userId', protect, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const msgs = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.user.id },
        ],
      },
      order: [['sentAt', 'ASC']],
    });
    // Mark received as read
    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { senderId: req.params.userId, receiverId: req.user.id, isRead: false } }
    );
    return res.status(200).json({ messages: msgs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch messages.' });
  }
});

module.exports.messageRouter = messageRouter;

// ════════════════════════════════════════════════════════

// ── routes/sessions.js ─────────────────────────────────
const sessionRouter = express.Router();

// Mentor schedules a session
sessionRouter.post('/', protect, restrictTo('mentor'), async (req, res) => {
  try {
    const { learnerId, scheduledAt, durationMinutes, meetingLink } = req.body;
    const session = await MentorshipSession.create({
      mentorId: req.user.id,
      learnerId,
      scheduledAt,
      durationMinutes: durationMinutes || 60,
      meetingLink,
    });
    return res.status(201).json({ message: 'Session scheduled.', session });
  } catch (err) {
    return res.status(500).json({ message: 'Could not schedule session.' });
  }
});

// Get sessions for the logged-in user
sessionRouter.get('/', protect, async (req, res) => {
  try {
    const where = req.user.role === 'mentor'
      ? { mentorId: req.user.id }
      : { learnerId: req.user.id };
    const sessions = await MentorshipSession.findAll({ where, order: [['scheduledAt', 'DESC']] });
    return res.status(200).json({ sessions });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch sessions.' });
  }
});

// Mentor marks session complete with notes
sessionRouter.patch('/:id/complete', protect, restrictTo('mentor'), async (req, res) => {
  try {
    const session = await MentorshipSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    await session.update({ status: 'completed', notes: req.body.notes || session.notes });
    return res.status(200).json({ message: 'Session marked as complete.', session });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update session.' });
  }
});

module.exports.sessionRouter = sessionRouter;

// ════════════════════════════════════════════════════════

// ── routes/progress.js ─────────────────────────────────
const progressRouter = express.Router();

// Get progress report for a learner (admin or the learner themselves)
progressRouter.get('/:learnerId', protect, async (req, res) => {
  try {
    const { learnerId } = req.params;
    if (req.user.role === 'learner' && req.user.id !== learnerId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const completed = await LearnerModule.findAll({ where: { learnerId, isCompleted: true } });
    const totalModules = await LearningModule.count({ where: { isPublished: true } });
    const passed = await AssessmentAttempt.findAll({ where: { learnerId, passed: true } });
    const subs = await Submission.findAll({ where: { learnerId, status: 'approved' } });
    const certs = await Certificate.findAll({ where: { learnerId } });

    const completionPct = totalModules > 0
      ? Math.round((completed.length / totalModules) * 100 * 10) / 10
      : 0;

    const [report] = await ProgressReport.findOrCreate({
      where: { learnerId },
      defaults: { learnerId },
    });

    await report.update({
      completionPct,
      modulesCompleted: completed.length,
      modulesTotal: totalModules,
      assessmentsPassed: passed.length,
      submissionsApproved: subs.length,
      certificatesEarned: certs.length,
      lastActivityAt: new Date(),
      generatedAt: new Date(),
    });

    return res.status(200).json({ report });
  } catch (err) {
    console.error('Progress error:', err);
    return res.status(500).json({ message: 'Could not generate progress report.' });
  }
});

module.exports.progressRouter = progressRouter;
