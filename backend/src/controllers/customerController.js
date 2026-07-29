const { Customer, Payment } = require('../models');
const { fn, col, literal, Op } = require('sequelize');
const { getExpiringCustomers } = require('../utils/expiryHelper');
const { sendReminder } = require('../services/whatsappService');

// Category-specific fields exposed on list endpoints
const CATEGORY_FIELDS = {
  insurance: ['id', 'name', 'contact_number', 'vehicle_number', 'start_date', 'end_date', 'amount_total', 'amount_paid', 'needs_reminder', 'notes'],
  permit:    ['id', 'name', 'contact_number', 'vehicle_number', 'start_date', 'end_date', 'amount_total', 'amount_paid', 'needs_reminder', 'notes'],
  fitness_puc: ['id', 'name', 'contact_number', 'start_date', 'end_date', 'needs_reminder'],
  license:   ['id', 'name', 'contact_number', 'start_date', 'end_date', 'needs_reminder'],
};

// ─── GET /api/customers ───────────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact_number: { [Op.like]: `%${search}%` } },
        { vehicle_number: { [Op.like]: `%${search}%` } },
      ];
    }

    const attributes = category ? CATEGORY_FIELDS[category] : undefined;

    const { count, rows } = await Customer.findAndCountAll({
      where,
      attributes,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    // Add computed amount_pending to each row
    const data = rows.map((c) => ({
      ...c.toJSON(),
      amount_pending: category && !CATEGORY_FIELDS[category].includes('amount_total')
        ? undefined
        : (parseFloat(c.amount_total) - parseFloat(c.amount_paid)).toFixed(2),
    }));

    return res.json({ success: true, total: count, page: parseInt(page), data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/customers ──────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, contact_number, category, vehicle_number, start_date, end_date, amount_total, amount_paid, notes } = req.body;

    const customer = await Customer.create({
      name,
      contact_number,
      category,
      vehicle_number,
      start_date: start_date || null,
      end_date: end_date || null,
      amount_total: parseFloat(amount_total) || 0,
      amount_paid: parseFloat(amount_paid) || 0,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Customer created.',
      data: { ...customer.toJSON(), amount_pending: customer.amount_pending },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/customers/:id ───────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ association: 'payments', order: [['payment_date', 'DESC']] }],
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    return res.json({
      success: true,
      data: { ...customer.toJSON(), amount_pending: customer.amount_pending },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/customers/:id ───────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const { name, contact_number, category, vehicle_number, start_date, end_date, amount_total, amount_paid, notes } = req.body;

    await customer.update({
      name: name ?? customer.name,
      contact_number: contact_number ?? customer.contact_number,
      category: category ?? customer.category,
      vehicle_number: vehicle_number ?? customer.vehicle_number,
      start_date: start_date ?? customer.start_date,
      end_date: end_date ?? customer.end_date,
      amount_total: amount_total !== undefined ? parseFloat(amount_total) : customer.amount_total,
      amount_paid: amount_paid !== undefined ? parseFloat(amount_paid) : customer.amount_paid,
      notes: notes ?? customer.notes,
    });

    return res.json({
      success: true,
      message: 'Customer updated.',
      data: { ...customer.toJSON(), amount_pending: customer.amount_pending },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/customers/:id ────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    await customer.destroy();
    return res.json({ success: true, message: 'Customer deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/customers/:id/send-reminder ────────────────────────────────────
exports.sendReminder = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const result = await sendReminder(customer);

    const statusCode = result.status === 'failed' ? 500 : 200;
    return res.status(statusCode).json({
      success: result.status !== 'failed',
      message: result.status === 'failed'
        ? 'WhatsApp message failed to send.'
        : `Reminder sent via ${process.env.WHATSAPP_PROVIDER || 'stub'}.`,
      data: result.log,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/customers/expiring-soon ────────────────────────────────────────
exports.expiringSoon = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const { category } = req.query;

    const customers = await getExpiringCustomers(days, category || null);
    return res.json({ success: true, days, total: customers.length, data: customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
