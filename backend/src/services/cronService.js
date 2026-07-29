const cron = require('node-cron');
const { Customer } = require('../models');
const { getExpiringCustomers } = require('../utils/expiryHelper');

/**
 * Daily job: scan all customers whose end_date is within 30 days
 * and set needs_reminder = true so the frontend can highlight them.
 *
 * Runs every day at 7:00 AM.
 */
async function runExpiryCheck() {
  console.log('[Cron] Running daily expiry check...');
  try {
    // First, reset all needs_reminder flags
    await Customer.update({ needs_reminder: false }, { where: {} });

    // Then flag expiring customers
    const expiring = await getExpiringCustomers(30);
    if (expiring.length === 0) {
      console.log('[Cron] No expiring customers found.');
      return;
    }

    const ids = expiring.map((c) => c.id);
    await Customer.update({ needs_reminder: true }, { where: { id: ids } });

    console.log(`[Cron] Flagged ${expiring.length} customer(s) with needs_reminder=true.`);
  } catch (err) {
    console.error('[Cron] Expiry check failed:', err.message);
  }
}

function startAll() {
  // Daily at 7:00 AM
  cron.schedule('0 7 * * *', runExpiryCheck, {
    timezone: 'Asia/Kolkata',
  });

  console.log('[Cron] Scheduled: daily expiry check at 07:00 IST');
}

module.exports = { startAll, runExpiryCheck };
