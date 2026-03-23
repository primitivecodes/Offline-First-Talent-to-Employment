const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './database.sqlite';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  // Allow ':memory:' for tests; resolve to absolute path otherwise
  storage: dbPath === ':memory:' ? ':memory:' : path.resolve(dbPath),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
  },
});

module.exports = sequelize;
