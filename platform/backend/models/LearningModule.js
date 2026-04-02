const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LearningModule = sequelize.define('LearningModule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Rich text / markdown content of the module',
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path to downloadable file (PDF, video, etc.)',
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in KB',
  },
  isOfflineAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  track: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'E.g. Software Dev Track, Data Science Track',
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Position within the track',
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in minutes',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Admin user ID who uploaded this module',
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tags: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Comma-separated tags',
  },
 approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved',
    comment: 'pending = awaiting admin review, approved = can be published, rejected = sent back',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason given by admin when rejecting a mentor module',
  },
});

module.exports = LearningModule;
