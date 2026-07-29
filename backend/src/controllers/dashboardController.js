const { Customer, Payment } = require('../models');
const { fn, col, Op } = require('sequelize');
const moment = require('moment');

// ─── GET /api/dashboard/summary ──────────────────────────────────────────────
exports.summary = async (req, res) => {
  try {
    const totalCustomers = await Customer.count();

    const collectionResult = await Payment.findOne({
      attributes: [[fn('SUM', col('amount')), 'total_collected']],
      raw: true,
    });
    const totalCollection = parseFloat(collectionResult?.total_collected || 0);

    const pendingResult = await Customer.findOne({
      attributes: [
        [fn('SUM', col('amount_total')), 'sum_total'],
        [fn('SUM', col('amount_paid')), 'sum_paid'],
      ],
      raw: true,
    });
    const totalAmount = parseFloat(pendingResult?.sum_total || 0);
    const totalPaid = parseFloat(pendingResult?.sum_paid || 0);
    const pendingCollection = (totalAmount - totalPaid).toFixed(2);

    return res.json({
      success: true,
      data: {
        totalCustomers,
        totalCollection: totalCollection.toFixed(2),
        pendingCollection,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/dashboard/monthly-collection ───────────────────────────────────
exports.monthlyCollection = async (req, res) => {
  try {
    const twelveMonthsAgo = moment().subtract(12, 'months').format('YYYY-MM-DD');

    const payments = await Payment.findAll({
      attributes: ['payment_date', 'amount'],
      where: { payment_date: { [Op.gte]: twelveMonthsAgo } },
      raw: true,
    });

    const grouped = {};
    for (const payment of payments) {
      const sortKey = moment(payment.payment_date).format('YYYY-MM');
      const label = moment(payment.payment_date).format('MMM YYYY');
      if (!grouped[sortKey]) {
        grouped[sortKey] = { month: label, total: 0 };
      }
      grouped[sortKey].total += parseFloat(payment.amount);
    }

    const data = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({ month: value.month, total: value.total }));

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
