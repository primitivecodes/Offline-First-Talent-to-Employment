const { body, validationResult } = require('express-validator');

// ── Helper: run validations and return errors ──────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg, // return first error only
      errors: errors.array(),
    });
  }
  next();
};

// ── Auth validators ────────────────────────────────────
const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
  body('role')
    .notEmpty().withMessage('Role is required.')
    .isIn(['learner', 'employer', 'mentor']).withMessage('Role must be learner, mentor or employer.'),
  body('phone')
    .optional()
    .matches(/^[0-9]{9,15}$/).withMessage('Phone must be 9–15 digits, no spaces or + symbol.'),
  body('organisation')
    .if(body('role').equals('employer'))
    .notEmpty().withMessage('Organisation name is required for employers.')
    .isLength({ max: 150 }).withMessage('Organisation name is too long.'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordRules = [
  body('email').trim().isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required.'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('New password must contain at least one number.'),
];

// ── Payment validators ─────────────────────────────────
const paymentRules = [
  body('phone')
    .notEmpty().withMessage('MTN Mobile Money phone number is required.')
    .matches(/^[0-9]{9,15}$/).withMessage('Phone must be 9–15 digits (no + or spaces).'),
];

// ── Module validators ──────────────────────────────────
const moduleRules = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 200 }).withMessage('Title too long.'),
  body('description').trim().notEmpty().withMessage('Description is required.').isLength({ max: 2000 }).withMessage('Description too long.'),
  body('duration').optional().isInt({ min: 1, max: 600 }).withMessage('Duration must be 1–600 minutes.'),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('Order index must be a non-negative integer.'),
];

// ── Assessment validators ──────────────────────────────
const assessmentRules = [
  body('moduleId').notEmpty().withMessage('moduleId is required.'),
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('questions').notEmpty().withMessage('Questions are required.').custom((val) => {
    try {
      const qs = JSON.parse(val);
      if (!Array.isArray(qs) || qs.length === 0) throw new Error();
      qs.forEach((q) => {
        if (!q.question?.trim()) throw new Error('Each question must have text.');
      });
      return true;
    } catch {
      throw new Error('Questions must be a valid non-empty JSON array.');
    }
  }),
  body('passMark').optional().isInt({ min: 1, max: 100 }).withMessage('Pass mark must be 1–100.'),
  body('durationMinutes').optional().isInt({ min: 5, max: 300 }).withMessage('Duration must be 5–300 minutes.'),
];

// ── Message validator ──────────────────────────────────
const messageRules = [
  body('receiverId').notEmpty().withMessage('receiverId is required.'),
  body('content').trim().notEmpty().withMessage('Message content cannot be empty.')
    .isLength({ max: 5000 }).withMessage('Message is too long.'),
];

// ── Feedback validator ─────────────────────────────────
const feedbackRules = [
  body('content').trim().notEmpty().withMessage('Feedback content is required.')
    .isLength({ min: 10, max: 5000 }).withMessage('Feedback must be 10–5000 characters.'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5.'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
  paymentRules,
  moduleRules,
  assessmentRules,
  messageRules,
  feedbackRules,
};
