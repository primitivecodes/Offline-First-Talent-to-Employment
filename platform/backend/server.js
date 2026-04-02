require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const sequelize = require('./config/database');

// Models — import to register with Sequelize
require('./models/User');
require('./models/Payment');
require('./models/LearningModule');
require('./models/index');

// Routes
const authRoutes        = require('./routes/auth');
const paymentRoutes     = require('./routes/payments');
const moduleRoutes      = require('./routes/modules');
const assessmentRoutes  = require('./routes/assessments');
const certificateRoutes = require('./routes/certificates');
const portfolioRoutes   = require('./routes/portfolios');
const messageRoutes     = require('./routes/messages');
const userRoutes        = require('./routes/users');
const submissionRoutes  = require('./routes/submissions');
const sessionRoutes     = require('./routes/sessions');
const progressRoutes    = require('./routes/progress');
const adminRoutes       = require('./routes/admin');

// Utilities
const { runSubscriptionCron } = require('./utils/subscriptionCron');
const { generalLimiter }      = require('./middleware/rateLimiter');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', generalLimiter);

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/modules',      moduleRoutes);
app.use('/api/assessments',  assessmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/portfolios',   portfolioRoutes);
app.use('/api/messages',     messageRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/submissions',  submissionRoutes);
app.use('/api/sessions',     sessionRoutes);
app.use('/api/progress',     progressRoutes);
app.use('/api/admin',        adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── 404 handler ────────────────────────────────────────
app.use('/api/*', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));

// ── Global error handler ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// ── Boot ───────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');
    await sequelize.sync({ alter: true });
    console.log('✓ Database synced');

    ['uploads/photos', 'uploads/modules', 'uploads/submissions', 'uploads/certificates']
      .forEach(dir => fs.mkdirSync(path.join(__dirname, dir), { recursive: true }));

    app.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));

    runSubscriptionCron();
    setInterval(runSubscriptionCron, 24 * 60 * 60 * 1000);
    console.log('✓ Subscription cron scheduled');
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
};

start();
