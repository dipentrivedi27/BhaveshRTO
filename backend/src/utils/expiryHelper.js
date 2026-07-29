const { Op } = require('sequelize');
const { Customer } = require('../models');

/**
 * Returns customers whose end_date falls within the next `days` days.
 * This is the single source of truth — used by both the cron job and the API.
 *
 * @param {number} days - look-ahead window (default 30)
 * @param {string|null} category - optional category filter
 * @returns {Promise<Customer[]>}
 */
async function getExpiringCustomers(days = 30, category = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const where = {
    end_date: {
      [Op.between]: [today, futureDate],
    },
  };

  if (category) {
    where.category = category;
  }

  return Customer.findAll({ where });
}

/**
 * Check if a single customer is expiring within `days` days.
 * @param {object} customer - Customer instance or POJO with end_date
 * @param {number} days
 * @returns {boolean}
 */
function isExpiringSoon(customer, days = 30) {
  if (!customer.end_date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse YYYY-MM-DD string safely without UTC shifting
  const dateParts = typeof customer.end_date === 'string'
    ? customer.end_date.split('T')[0].split('-').map(Number)
    : [customer.end_date.getFullYear(), customer.end_date.getMonth() + 1, customer.end_date.getDate()];

  const expiry = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

module.exports = { getExpiringCustomers, isExpiringSoon };
