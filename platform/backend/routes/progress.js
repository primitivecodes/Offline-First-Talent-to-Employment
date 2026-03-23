const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { ProgressReport, LearnerModule, AssessmentAttempt, Submission, Certificate } = require('../models/index');
const LearningModule = require('../models/LearningModule');

// ── Get or generate progress report ───────────────────
router.get('/:learnerId', protect, async (req, res) => {
  try {
    const { learnerId } = req.params;

    // Learners can only see their own progress
    if (req.user.role === 'learner' && req.user.id !== learnerId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const [completed, totalModules, passed, approvedSubs, certs] = await Promise.all([
      LearnerModule.findAll({ where: { learnerId, isCompleted: true } }),
      LearningModule.count({ where: { isPublished: true } }),
      AssessmentAttempt.findAll({ where: { learnerId, passed: true } }),
      Submission.findAll({ where: { learnerId, status: 'approved' } }),
      Certificate.findAll({ where: { learnerId } }),
    ]);

    const completionPct = totalModules > 0
      ? Math.round((completed.length / totalModules) * 1000) / 10
      : 0;

    const [report] = await ProgressReport.findOrCreate({
      where: { learnerId },
      defaults: { learnerId },
    });

    await report.update({
      completionPct,
      modulesCompleted:    completed.length,
      modulesTotal:        totalModules,
      assessmentsPassed:   passed.length,
      submissionsApproved: approvedSubs.length,
      certificatesEarned:  certs.length,
      lastActivityAt:      new Date(),
      generatedAt:         new Date(),
    });

    return res.status(200).json({ report });
  } catch (err) {
    console.error('Progress error:', err);
    return res.status(500).json({ message: 'Could not generate progress report.' });
  }
});

module.exports = router;
