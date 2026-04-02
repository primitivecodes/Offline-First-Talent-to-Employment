const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');
const { protect } = require('../middleware/auth');
const {
  validate, registerRules, loginRules,
  forgotPasswordRules, resetPasswordRules, changePasswordRules,
} = require('../middleware/validators');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');

const storage = multer.diskStorage({
  destination: './uploads/photos',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/register',         registerLimiter,        registerRules,       validate, register);
router.post('/login',            loginLimiter,           loginRules,          validate, login);
router.post('/forgot-password',  forgotPasswordLimiter,  forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password',                           resetPasswordRules,  validate, resetPassword);
router.get('/me',                protect, getMe);
router.patch('/profile',         protect, upload.single('photo'), updateProfile);
router.patch('/change-password', protect, changePasswordRules, validate, changePassword);

module.exports = router;
