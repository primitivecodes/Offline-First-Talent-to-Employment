const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Production — PostgreSQL on Render
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });
} else {
  // Development — SQLite locally
  sequelize = new Sequelize({
    dialect:  'sqlite',
    storage:  process.env.DB_PATH || './database.sqlite',
    logging:  false,
  });
}

module.exports = sequelize;