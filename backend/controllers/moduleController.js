const LearningModule = require('../models/LearningModule');
const { LearnerModule, Assessment } = require('../models/index');
const User = require('../models/User');
const { Op } = require('sequelize');

// ── Get all modules ────────────────────────────────────
// Admin/mentor: sees all including pending
// Learner: sees published only with their progress
const getAllModules = async (req, res) => {
  try {
    const where = {};
    if (req.query.track)    where.track    = req.query.track;
    if (req.query.category) where.category = req.query.category;

    // Learners only see published modules
    if (req.user.role === 'learner') {
      where.isPublished = true;
    }

    // Mentors see published + their own pending modules
    if (req.user.role === 'mentor') {
      where[Op.or] = [
        { isPublished: true },
        { createdBy: req.user.id },
      ];
    }

    const modules = await LearningModule.findAll({
      where,
      order: [['track', 'ASC'], ['orderIndex', 'ASC']],
      attributes: { exclude: ['content'] },
    });

    // Attach learner progress
    if (req.user.role === 'learner') {
      const progress = await LearnerModule.findAll({ where: { learnerId: req.user.id } });
      const progressMap = {};
      progress.forEach((p) => { progressMap[p.moduleId] = p; });
      const enriched = modules.map((m) => ({ ...m.toJSON(), progress: progressMap[m.id] || null }));
      return res.status(200).json({ modules: enriched });
    }

    return res.status(200).json({ modules });
  } catch (err) {
    console.error('Get modules error:', err);
    return res.status(500).json({ message: 'Could not fetch modules.' });
  }
};

// ── Get single module with full content ────────────────
const getModule = async (req, res) => {
  try {
    const where = { id: req.params.id };

    // Mentors can view their own unpublished modules
    if (req.user.role !== 'mentor' && req.user.role !== 'admin') {
      where.isPublished = true;
    }

    const module = await LearningModule.findOne({ where });
    if (!module) return res.status(404).json({ message: 'Module not found.' });

    if (req.user.role === 'learner') {
      const [record] = await LearnerModule.findOrCreate({
        where: { learnerId: req.user.id, moduleId: module.id },
        defaults: { learnerId: req.user.id, moduleId: module.id },
      });
      await record.update({ lastAccessedAt: new Date() });
    }

    const assessment = await Assessment.findOne({
      where: { moduleId: module.id, isPublished: true },
      attributes: ['id', 'title', 'maxScore', 'passMark', 'durationMinutes'],
    });

    return res.status(200).json({ module, assessment: assessment || null });
  } catch (err) {
    console.error('Get module error:', err);
    return res.status(500).json({ message: 'Could not fetch module.' });
  }
};

// ── Mark module as complete ────────────────────────────
const completeModule = async (req, res) => {
  try {
    const [record] = await LearnerModule.findOrCreate({
      where: { learnerId: req.user.id, moduleId: req.params.id },
      defaults: { learnerId: req.user.id, moduleId: req.params.id },
    });
    await record.update({ isCompleted: true, progressPct: 100, completedAt: new Date() });
    return res.status(200).json({ message: 'Module marked as complete.' });
  } catch (err) {
    return res.status(500).json({ message: 'Could not mark module complete.' });
  }
};

// ── Sync offline progress ──────────────────────────────
const syncOfflineProgress = async (req, res) => {
  try {
    const { moduleId, progressPct, offlineData, isCompleted } = req.body;
    const [record] = await LearnerModule.findOrCreate({
      where: { learnerId: req.user.id, moduleId },
      defaults: { learnerId: req.user.id, moduleId },
    });
    if (progressPct > record.progressPct) {
      await record.update({
        progressPct,
        isCompleted: isCompleted || record.isCompleted,
        completedAt: isCompleted && !record.completedAt ? new Date() : record.completedAt,
        lastAccessedAt: new Date(),
        offlineData: JSON.stringify(offlineData || {}),
      });
    }
    return res.status(200).json({ message: 'Progress synced successfully.', record });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ message: 'Could not sync offline progress.' });
  }
};

// ── Create module (admin or mentor) ───────────────────
// Admin: published = false, status = approved (goes live when toggled)
// Mentor: published = false, status = pending (needs admin approval)
const createModule = async (req, res) => {
  try {
    const { title, description, content, category, track, orderIndex, duration, tags } = req.body;
    const isMentor = req.user.role === 'mentor';

    const module = await LearningModule.create({
      title,
      description,
      content,
      category,
      track,
      orderIndex:         orderIndex || 0,
      duration,
      tags,
      createdBy:          req.user.id,
      isOfflineAvailable: true,
      isPublished:        false,
      approvalStatus:     isMentor ? 'pending' : 'approved',
      fileUrl:  req.file ? `/uploads/modules/${req.file.filename}` : null,
      fileSize: req.file ? Math.round(req.file.size / 1024) : null,
    });

    const message = isMentor
      ? 'Module submitted for admin approval.'
      : 'Module created successfully.';

    return res.status(201).json({ message, module });
  } catch (err) {
    console.error('Create module error:', err);
    return res.status(500).json({ message: 'Could not create module.' });
  }
};

// ── Admin: approve or reject a mentor module ──────────
const reviewModule = async (req, res) => {
  try {
    const { status, reason } = req.body; // status: approved | rejected
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const module = await LearningModule.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: 'Module not found.' });

    await module.update({
      approvalStatus:   status,
      rejectionReason:  status === 'rejected' ? (reason || 'No reason provided.') : null,
      // Auto-publish when approved
      isPublished:      status === 'approved',
    });

    // Notify the mentor who created it
    const mentor = await User.findByPk(module.createdBy);
    if (mentor) {
      const { sendWelcomeEmail } = require('../utils/emailService');
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const subject = status === 'approved'
        ? `Your module "${module.title}" has been approved`
        : `Your module "${module.title}" was not approved`;
      const html = status === 'approved'
        ? `<h2>Module Approved ✓</h2><p>Hi ${mentor.name}, your module <strong>"${module.title}"</strong> has been approved and is now live on the platform.</p>`
        : `<h2>Module Not Approved</h2><p>Hi ${mentor.name}, your module <strong>"${module.title}"</strong> was not approved.</p><p><strong>Reason:</strong> ${reason || 'No reason provided.'}</p><p>You can edit and resubmit it.</p>`;
      transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@talentplatform.rw',
        to: mentor.email,
        subject,
        html,
      }).catch(() => {});
    }
    return res.status(200).json({
      message: `Module ${status}.`,
      module,
    });
  } catch (err) {
    console.error('Review module error:', err);
    return res.status(500).json({ message: 'Could not review module.' });
  }
};

// ── Admin: get pending mentor modules ─────────────────
const getPendingModules = async (req, res) => {
  try {
    const modules = await LearningModule.findAll({
      where: { approvalStatus: 'pending' },
      order: [['createdAt', 'ASC']],
    });

    // Attach mentor name to each
    const enriched = await Promise.all(modules.map(async (m) => {
      const mentor = await User.findByPk(m.createdBy, { attributes: ['name', 'email', 'expertise'] });
      return { ...m.toJSON(), mentor };
    }));

    return res.status(200).json({ modules: enriched });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch pending modules.' });
  }
};

// ── Toggle publish ─────────────────────────────────────
const togglePublish = async (req, res) => {
  try {
    const module = await LearningModule.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: 'Module not found.' });
    if (module.approvalStatus !== 'approved') {
      return res.status(403).json({ message: 'Only approved modules can be published.' });
    }
    await module.update({ isPublished: !module.isPublished });
    return res.status(200).json({
      message: `Module ${module.isPublished ? 'published' : 'unpublished'}.`,
      module,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not toggle publish status.' });
  }
};

module.exports = {
  getAllModules,
  getModule,
  completeModule,
  syncOfflineProgress,
  createModule,
  reviewModule,
  getPendingModules,
  togglePublish,
};
