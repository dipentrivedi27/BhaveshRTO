require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/models');
const cronService = require('./src/services/cronService');

// Route imports
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const customerRoutes = require('./src/routes/customers');
const paymentRoutes = require('./src/routes/payments');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', require('./src/routes/receipts'));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── DB sync + server start ──────────────────────────────────────────────────
async function start() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set. Copy .env.example to .env and configure it.');
    }

    await sequelize.authenticate();
    console.log('✅  Database connected.');

    // Sync models (alter: true for dev, use migrations in prod)
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('✅  Models synced.');

    // Start cron jobs
    cronService.startAll();
    console.log('✅  Cron jobs started.');

    app.listen(PORT, () => {
      console.log(`🚀  Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌  Startup error:', err);
    process.exit(1);
  }
}

start();

module.exports = app; // for testing
