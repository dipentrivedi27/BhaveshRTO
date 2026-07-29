const { Customer, Payment } = require('../models');
const { fn, col } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { generateReceiptPDF } = require('../services/pdfService');
const { Admin } = require('../models');

// ─── POST /api/payments ───────────────────────────────────────────────────────
exports.recordPayment = async (req, res) => {
  try {
    const { customer_id, amount, payment_date, method } = req.body;

    const customer = await Customer.findByPk(customer_id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const receipt_number = `REC-${Date.now()}`;
    const payment = await Payment.create({
      customer_id,
      amount: parseFloat(amount),
      payment_date: payment_date || new Date(),
      method: method || null,
      receipt_number,
    });

    // Update amount_paid on customer
    const totalPaid = await Payment.findOne({
      where: { customer_id },
      attributes: [[fn('SUM', col('amount')), 'total']],
      raw: true,
    });
    await customer.update({ amount_paid: parseFloat(totalPaid?.total || 0) });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded.',
      data: payment,
      amount_pending: customer.amount_pending,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/receipts/:customerId ───────────────────────────────────────────
exports.getReceipt = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.customerId, {
      include: [{ association: 'payments', order: [['payment_date', 'DESC']] }],
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const payments = customer.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPending = parseFloat(customer.amount_total) - totalPaid;

    return res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          contact_number: customer.contact_number,
          category: customer.category,
          vehicle_number: customer.vehicle_number,
          start_date: customer.start_date,
          end_date: customer.end_date,
          amount_total: customer.amount_total,
        },
        payments,
        totalPaid: totalPaid.toFixed(2),
        totalPending: totalPending.toFixed(2),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/receipts/:customerId/pdf ───────────────────────────────────────
exports.getReceiptPDF = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.customerId, {
      include: [{ association: 'payments', order: [['payment_date', 'DESC']] }],
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    const admin = await Admin.findByPk(req.admin.id, { attributes: ['name'] });
    const payments = customer.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPending = parseFloat(customer.amount_total) - totalPaid;

    const pdfBuffer = await generateReceiptPDF({
      customer: customer.toJSON(),
      payments: payments.map((p) => p.toJSON()),
      totalPaid: totalPaid.toFixed(2),
      totalPending: totalPending.toFixed(2),
      adminName: admin?.name || 'Admin',
    });

    const filename = `receipt_${customer.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF] Error:', err.message);
    return res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
  }
};

// ─── GET /api/receipts — overall summary ─────────────────────────────────────
exports.overallSummary = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      include: [{ association: 'payments' }],
    });

    const rows = customers.map((c) => {
      const paid = (c.payments || []).reduce((s, p) => s + parseFloat(p.amount), 0);
      const pending = parseFloat(c.amount_total) - paid;
      return {
        id: c.id,
        name: c.name,
        contact_number: c.contact_number,
        category: c.category,
        vehicle_number: c.vehicle_number,
        amount_total: parseFloat(c.amount_total),
        amount_paid: paid,
        amount_pending: pending,
      };
    });

    const grandTotal = rows.reduce((s, r) => s + r.amount_total, 0);
    const grandPaid = rows.reduce((s, r) => s + r.amount_paid, 0);
    const grandPending = rows.reduce((s, r) => s + r.amount_pending, 0);

    return res.json({
      success: true,
      data: {
        summary: { grandTotal, grandPaid, grandPending },
        customers: rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
