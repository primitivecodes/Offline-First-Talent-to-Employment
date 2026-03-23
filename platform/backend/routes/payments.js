const express = require('express');
const router  = express.Router();
const { initiateLearnerPayment, initiateEmployerPayment, verifyPayment, momoCallback, getMyPayments } = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, paymentRules } = require('../middleware/validators');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.post('/learner/initiate',  protect, restrictTo('learner'),  paymentLimiter, paymentRules, validate, initiateLearnerPayment);
router.post('/employer/initiate', protect, restrictTo('employer'), paymentLimiter, paymentRules, validate, initiateEmployerPayment);
router.get('/verify/:paymentId',  protect, verifyPayment);
router.post('/momo-callback',     momoCallback);
router.get('/my-payments',        protect, getMyPayments);

module.exports = router;
