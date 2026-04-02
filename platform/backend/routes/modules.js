const express = require('express');
const router  = express.Router();
const {
  getAllModules,
  getModule,
  completeModule,
  syncOfflineProgress,
  createModule,
  reviewModule,
  getPendingModules,
  togglePublish,
} = require('../controllers/moduleController');
const { protect, restrictTo, requireCourseAccess } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: './uploads/modules',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

// Public list (auth required)
router.get('/', protect, getAllModules);

// Admin: pending mentor modules
router.get('/pending', protect, restrictTo('admin'), getPendingModules);

// Open a module
router.get('/:id', protect, requireCourseAccess, getModule);

// Learner actions
router.post('/:id/complete', protect, restrictTo('learner'), requireCourseAccess, completeModule);
router.post('/sync', protect, restrictTo('learner'), syncOfflineProgress);

// Admin OR mentor can create modules
router.post('/', protect, restrictTo('admin', 'mentor'), upload.single('file'), createModule);

// Admin: approve or reject a mentor module
router.patch('/:id/review', protect, restrictTo('admin'), reviewModule);

// Admin: publish/unpublish
router.patch('/:id/publish', protect, restrictTo('admin'), togglePublish);

module.exports = router;