const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ── Assessment ────────────────────────────────────────
const Assessment = sequelize.define('Assessment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  moduleId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  questions: { type: DataTypes.TEXT, allowNull: false, comment: 'JSON array of question objects' },
  maxScore: { type: DataTypes.INTEGER, defaultValue: 100 },
  passMark: { type: DataTypes.INTEGER, defaultValue: 60 },
  durationMinutes: { type: DataTypes.INTEGER, defaultValue: 30 },
  createdBy: { type: DataTypes.UUID, allowNull: true },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// ── AssessmentAttempt ─────────────────────────────────
const AssessmentAttempt = sequelize.define('AssessmentAttempt', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  learnerId: { type: DataTypes.UUID, allowNull: false },
  assessmentId: { type: DataTypes.UUID, allowNull: false },
  answers: { type: DataTypes.TEXT, allowNull: true, comment: 'JSON of submitted answers' },
  score: { type: DataTypes.FLOAT, allowNull: true },
  passed: { type: DataTypes.BOOLEAN, defaultValue: false },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  timeTakenMinutes: { type: DataTypes.INTEGER, allowNull: true },
  submittedOffline: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// ── Submission ────────────────────────────────────────
const Submission = sequelize.define('Submission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  learnerId: { type: DataTypes.UUID, allowNull: false },
  moduleId: { type: DataTypes.UUID, allowNull: false },
  projectTitle: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  fileUrl: { type: DataTypes.STRING, allowNull: true },
  repoUrl: { type: DataTypes.STRING, allowNull: true, comment: 'GitHub or similar repo link' },
  status: {
    type: DataTypes.ENUM('submitted', 'under_review', 'reviewed', 'approved', 'rejected'),
    defaultValue: 'submitted',
  },
  submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  assignedMentorId: { type: DataTypes.UUID, allowNull: true },
});

// ── Feedback ──────────────────────────────────────────
const Feedback = sequelize.define('Feedback', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  submissionId: { type: DataTypes.UUID, allowNull: false },
  mentorId: { type: DataTypes.UUID, allowNull: false },
  learnerId: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// ── Certificate ───────────────────────────────────────
const Certificate = sequelize.define('Certificate', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  learnerId: { type: DataTypes.UUID, allowNull: false },
  moduleId: { type: DataTypes.UUID, allowNull: false },
  assessmentAttemptId: { type: DataTypes.UUID, allowNull: true },
  skillArea: { type: DataTypes.STRING, allowNull: false },
  issuedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  isValid: { type: DataTypes.BOOLEAN, defaultValue: true },
  certificateUrl: { type: DataTypes.STRING, allowNull: true, comment: 'Generated PDF path' },
  verificationCode: { type: DataTypes.STRING, allowNull: true, unique: true },
});

// ── Portfolio ─────────────────────────────────────────
const Portfolio = sequelize.define('Portfolio', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  learnerId: { type: DataTypes.UUID, allowNull: false, unique: true },
  visibility: { type: DataTypes.ENUM('public', 'private'), defaultValue: 'public' },
  bio: { type: DataTypes.TEXT, allowNull: true },
  skills: { type: DataTypes.TEXT, allowNull: true, comment: 'JSON array of skill strings' },
  githubUrl: { type: DataTypes.STRING, allowNull: true },
  linkedinUrl: { type: DataTypes.STRING, allowNull: true },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
});

// ── PortfolioItem ─────────────────────────────────────
const PortfolioItem = sequelize.define('PortfolioItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  portfolioId: { type: DataTypes.UUID, allowNull: false },
  itemType: { type: DataTypes.ENUM('certificate', 'submission', 'project'), allowNull: false },
  itemId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  addedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// ── Message ───────────────────────────────────────────
const Message = sequelize.define('Message', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  senderId: { type: DataTypes.UUID, allowNull: false },
  receiverId: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE, allowNull: true },
  sentAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// ── MentorshipSession ─────────────────────────────────
const MentorshipSession = sequelize.define('MentorshipSession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mentorId: { type: DataTypes.UUID, allowNull: false },
  learnerId: { type: DataTypes.UUID, allowNull: false },
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, defaultValue: 60 },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'scheduled',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  meetingLink: { type: DataTypes.STRING, allowNull: true },
});

// ── ProgressReport ────────────────────────────────────
const ProgressReport = sequelize.define('ProgressReport', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  learnerId: { type: DataTypes.UUID, allowNull: false },
  completionPct: { type: DataTypes.FLOAT, defaultValue: 0 },
  modulesCompleted: { type: DataTypes.INTEGER, defaultValue: 0 },
  modulesTotal: { type: DataTypes.INTEGER, defaultValue: 0 },
  assessmentsPassed: { type: DataTypes.INTEGER, defaultValue: 0 },
  submissionsApproved: { type: DataTypes.INTEGER, defaultValue: 0 },
  certificatesEarned: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastActivityAt: { type: DataTypes.DATE, allowNull: true },
  generatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// ── LearnerModule (progress tracking join) ────────────
const LearnerModule = sequelize.define('LearnerModule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  learnerId: { type: DataTypes.UUID, allowNull: false },
  moduleId: { type: DataTypes.UUID, allowNull: false },
  isDownloaded: { type: DataTypes.BOOLEAN, defaultValue: false },
  isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  progressPct: { type: DataTypes.FLOAT, defaultValue: 0 },
  lastAccessedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  offlineData: { type: DataTypes.TEXT, allowNull: true, comment: 'JSON blob for offline state' },
});

module.exports = {
  Assessment,
  AssessmentAttempt,
  Submission,
  Feedback,
  Certificate,
  Portfolio,
  PortfolioItem,
  Message,
  MentorshipSession,
  ProgressReport,
  LearnerModule,
};
