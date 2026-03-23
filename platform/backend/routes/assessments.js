const express = require('express');
const router  = express.Router();
const { getAssessment, submitAssessment, createAssessment, publishAssessment, getMyAttempts } = require('../controllers/assessmentController');
const { protect, restrictTo, requireCourseAccess } = require('../middleware/auth');

router.get('/my-attempts',     protect, restrictTo('learner'), getMyAttempts);
router.get('/:id',             protect, requireCourseAccess,   getAssessment);
router.post('/:id/submit',     protect, requireCourseAccess,   submitAssessment);
router.post('/',               protect, restrictTo('admin'),   createAssessment);
router.patch('/:id/publish',   protect, restrictTo('admin'),   publishAssessment);

module.exports = router;
