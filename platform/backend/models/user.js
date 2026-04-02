const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [2, 100] },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('learner', 'mentor', 'admin', 'employer'),
    allowNull: false,
    defaultValue: 'learner',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Learner-specific
  hasPaidAccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True after learner pays $10 to unlock courses',
  },
  skillLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: true,
  },
  learningPath: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Employer-specific
  organisation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isEmployerVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Admin manually verifies employers',
  },
  subscriptionStatus: {
    type: DataTypes.ENUM('inactive', 'active', 'suspended'),
    defaultValue: 'inactive',
    comment: 'For employer monthly subscription',
  },
  subscriptionExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Mentor-specific
  expertise: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Password reset
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  profilePhoto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    defaultValue: 'Rwanda',
  },
});

module.exports = User;
