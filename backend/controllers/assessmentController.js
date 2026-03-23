const { Assessment, AssessmentAttempt, Certificate, Portfolio, PortfolioItem } = require('../models/index');
const LearningModule = require('../models/LearningModule');
const User = require('../models/User');
const { sendCertificateEmail } = require('../utils/emailService');
const { v4: uuidv4 } = require('uuid');

// ── Get single assessment ──────────────────────────────
const getAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      where: { id: req.params.id, isPublished: true },
    });
    if (!assessment) return res.status(404).json({ message: 'Assessment not found.' });

    // Strip correct answers before sending to client
    const questions = JSON.parse(assessment.questions || '[]');
    const sanitised = questions.map(({ correctAnswer, explanation, ...q }) => q);

    return res.status(200).json({
      assessment: { ...assessment.toJSON(), questions: JSON.stringify(sanitised) },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch assessment.' });
  }
};

// ── Submit and auto-grade ─────────────────────────────
const submitAssessment = async (req, res) => {
  try {
    const { answers, timeTakenMinutes, submittedOffline } = req.body;
    const learnerId = req.user.id;

    const assessment = await Assessment.findByPk(req.params.id);
    if (!assessment) return res.status(404).json({ message: 'Assessment not found.' });

    const questions = JSON.parse(assessment.questions || '[]');
    const userAnswers = answers || {};

    // ── Auto-grade ─────────────────────────────────────
    let earned = 0;
    const pointsPerQ = assessment.maxScore / questions.length;
    const feedback = [];

    questions.forEach((q, i) => {
      const userAns = userAnswers[i];
      let correct = false;

      if (q.type === 'mcq' || q.type === 'true_false') {
        correct = userAns === q.correctAnswer;
      } else if (q.type === 'short_answer') {
        // Simple keyword match for short answers
        const keywords = (q.keywords || []).map((k) => k.toLowerCase());
        const answer   = String(userAns || '').toLowerCase();
        correct = keywords.length === 0 || keywords.some((kw) => answer.includes(kw));
      }

      if (correct) earned += pointsPerQ;
      feedback.push({ question: q.question, correct, explanation: q.explanation || null });
    });

    const score     = Math.round(earned * 10) / 10;
    const scorePct  = Math.round((score / assessment.maxScore) * 100);
    const passed    = scorePct >= assessment.passMark;

    // ── Save attempt ───────────────────────────────────
    const attempt = await AssessmentAttempt.create({
      learnerId,
      assessmentId: assessment.id,
      answers: JSON.stringify(userAnswers),
      score,
      passed,
      submittedAt: new Date(),
      timeTakenMinutes: timeTakenMinutes || 0,
      submittedOffline: submittedOffline || false,
    });

    let certificate = null;

    // ── Issue certificate if passed ────────────────────
    if (passed) {
      const module = await LearningModule.findByPk(assessment.moduleId);

      // Check if certificate already exists for this learner + module
      const existing = await Certificate.findOne({
        where: { learnerId, moduleId: assessment.moduleId },
      });

      if (!existing) {
        certificate = await Certificate.create({
          learnerId,
          moduleId: assessment.moduleId,
          assessmentAttemptId: attempt.id,
          skillArea: module ? module.title : 'General Skills',
          isValid: true,
          verificationCode: uuidv4().slice(0, 8).toUpperCase(),
        });

        // Add to portfolio
        const portfolio = await Portfolio.findOne({ where: { learnerId } });
        if (portfolio) {
          await PortfolioItem.create({
            portfolioId: portfolio.id,
            itemType: 'certificate',
            itemId: certificate.id,
            title: certificate.skillArea,
            description: `Passed assessment with ${scorePct}%`,
          });
          // Also add submission if exists
          await PortfolioItem.findOrCreate({
            where: { portfolioId: portfolio.id, itemType: 'certificate', itemId: certificate.id },
          });
        }

        // Email notification
        const user = await User.findByPk(learnerId);
        if (user) sendCertificateEmail(user, certificate);
      } else {
        certificate = existing;
      }
    }

    return res.status(200).json({
      score,
      scorePct,
      passed,
      maxScore: assessment.maxScore,
      passMark: assessment.passMark,
      timeTakenMinutes,
      feedback,
      certificate: certificate ? { id: certificate.id, skillArea: certificate.skillArea, verificationCode: certificate.verificationCode } : null,
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    return res.status(500).json({ message: 'Could not grade assessment.' });
  }
};

// ── Admin: create assessment ──────────────────────────
const createAssessment = async (req, res) => {
  try {
    const { moduleId, title, questions, maxScore, passMark, durationMinutes } = req.body;

    // Validate question format
    let qs;
    try { qs = JSON.parse(questions); } catch { return res.status(400).json({ message: 'questions must be a valid JSON array.' }); }

    const assessment = await Assessment.create({
      moduleId, title,
      questions: JSON.stringify(qs),
      maxScore: maxScore || 100,
      passMark: passMark || 60,
      durationMinutes: durationMinutes || 30,
      createdBy: req.user.id,
      isPublished: false,
    });

    return res.status(201).json({ message: 'Assessment created.', assessment });
  } catch (err) {
    return res.status(500).json({ message: 'Could not create assessment.' });
  }
};

// ── Admin: publish assessment ─────────────────────────
const publishAssessment = async (req, res) => {
  try {
    const a = await Assessment.findByPk(req.params.id);
    if (!a) return res.status(404).json({ message: 'Not found.' });
    await a.update({ isPublished: !a.isPublished });
    return res.status(200).json({ message: `Assessment ${a.isPublished ? 'published' : 'unpublished'}.` });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update assessment.' });
  }
};

// ── Get my attempts ───────────────────────────────────
const getMyAttempts = async (req, res) => {
  try {
    const attempts = await AssessmentAttempt.findAll({
      where: { learnerId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ attempts });
  } catch (err) {
    return res.status(500).json({ message: 'Could not fetch attempts.' });
  }
};

module.exports = { getAssessment, submitAssessment, createAssessment, publishAssessment, getMyAttempts };
