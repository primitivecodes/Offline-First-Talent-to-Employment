const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect, restrictTo, requireCourseAccess } = require('../middleware/auth');
const { Submission, Feedback } = require('../models/index');
const User = require('../models/User');
const { sendFeedbackNotification } = require('../utils/emailService');

const upload = multer({
  dest: './uploads/submissions',
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── Learner: submit a project ──────────────────────────
router.post('/', protect, restrictTo('learner'), requireCourseAccess, upload.single('file'), async (req, res) => {
  try {
    const { moduleId, projectTitle, description, repoUrl } = req.body;
    if (!moduleId || !projectTitle) {
      return res.status(400).json({ message: 'moduleId and projectTitle are required.' });
    }

    // ── Auto-assign to a mentor ──────────────────────
    // Find the module track, find all active mentors whose
    // expertise matches that track, pick the one with the
    // fewest current assignments. Falls back to null if no
    // matching mentor found — admin assigns manually.
    let assignedMentorId = null;
    try {
      const LearningModule = require('../models/LearningModule');
      const { Op } = require('sequelize');

      const module = await LearningModule.findByPk(moduleId, { attributes: ['track'] });
      if (module?.track) {
        const track = module.track.toLowerCase();

        // All active mentors
        const mentors = await User.findAll({
          where: { role: 'mentor', isActive: true },
          attributes: ['id', 'expertise'],
        });

        // Keep only those whose expertise matches the track
        const matched = mentors.filter((m) => {
          const exp = (m.expertise || '').toLowerCase();
          return exp.includes(track) || track.includes(exp);
        });

        if (matched.length > 0) {
          // Count active submissions per matched mentor
          const counts = await Promise.all(
            matched.map(async (m) => {
              const count = await Submission.count({
                where: {
                  assignedMentorId: m.id,
                  status: { [Op.in]: ['submitted', 'under_review'] },
                },
              });
              return { mentorId: m.id, count };
            })
          );

          // Assign to the mentor with the fewest active submissions
          counts.sort((a, b) => a.count - b.count);
          assignedMentorId = counts[0].mentorId;
        }
      }
    } catch (assignErr) {
      console.warn('[Auto-assign] Failed, falling back to admin:', assignErr.message);
    }

    const sub = await Submission.create({
      learnerId:        req.user.id,
      moduleId,
      projectTitle,
      description,
      repoUrl:          repoUrl || null,
      fileUrl:          req.file ? `/uploads/submissions/${req.file.filename}` : null,
      status:           assignedMentorId ? 'under_review' : 'submitted',
      assignedMentorId: assignedMentorId || null,
    });

    const message = assignedMentorId
      ? 'Project submitted and assigned to a mentor for review.'
      : 'Project submitted. An admin will assign a mentor shortly.';

    return res.status(201).json({ message, submission: sub });
  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ message: 'Could not submit project.' });
  }
});

// ── Learner: get own submissions ───────────────────────
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

// ── Mentor/Admin: list submissions ─────────────────────
router.get('/', protect, restrictTo('mentor', 'admin'), async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    // Mentors only see submissions assigned to them
    if (req.user.role === 'mentor') where.assignedMentorId = req.user.id;
    const subs = await Submission.findAll({
      where,
      order: [['submittedAt', 'DESC']],
    });
    return res.status(200).json({ submissions: subs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch submissions.' });
  }
});

// ── Admin: get all unassigned submissions ──────────────
router.get('/unassigned', protect, restrictTo('admin'), async (req, res) => {
  try {
    const subs = await Submission.findAll({
      where: { assignedMentorId: null, status: 'submitted' },
      order: [['submittedAt', 'ASC']],
    });
    return res.status(200).json({ submissions: subs });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch unassigned submissions.' });
  }
});

// ── Admin: manually assign submission to mentor ────────
router.patch('/:id/assign', protect, restrictTo('admin'), async (req, res) => {
  try {
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });
    await sub.update({
      assignedMentorId: req.body.mentorId,
      status: 'under_review',
    });
    return res.status(200).json({ message: 'Submission assigned.', submission: sub });
  } catch (err) {
    return res.status(500).json({ message: 'Could not assign submission.' });
  }
});

// ── Admin/Mentor: update submission status ─────────────
router.patch('/:id/status', protect, restrictTo('admin', 'mentor'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'under_review'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });
    await sub.update({ status });
    return res.status(200).json({ message: `Submission marked as ${status}.`, submission: sub });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update status.' });
  }
});

// ── Mentor: give feedback on a submission ──────────────
router.post('/:submissionId/feedback', protect, restrictTo('mentor'), async (req, res) => {
  try {
    const { content, rating } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ message: 'Feedback content is required.' });
    }

    const sub = await Submission.findByPk(req.params.submissionId);
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });

    const fb = await Feedback.create({
      submissionId: sub.id,
      mentorId:     req.user.id,
      learnerId:    sub.learnerId,
      content:      content.trim(),
      rating:       rating || null,
    });

    await sub.update({ status: 'reviewed', assignedMentorId: req.user.id });

    const learner = await User.findByPk(sub.learnerId);
    if (learner) sendFeedbackNotification(learner, req.user.name, sub.projectTitle);

    return res.status(201).json({ message: 'Feedback submitted.', feedback: fb });
  } catch (err) {
    return res.status(500).json({ message: 'Could not submit feedback.' });
  }
});

// ── Anyone: get feedback for a submission ──────────────
router.get('/:submissionId/feedback', protect, async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({
      where: { submissionId: req.params.submissionId },
      order: [['createdAt', 'DESC']],
    });
    if (req.user.role === 'learner') {
      await Feedback.update(
        { isRead: true },
        { where: { submissionId: req.params.submissionId, learnerId: req.user.id } }
      );
    }
    return res.status(200).json({ feedbacks });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch feedback.' });
  }
});

module.exports = router;