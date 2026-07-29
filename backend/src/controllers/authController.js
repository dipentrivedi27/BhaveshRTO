const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Admin, OTP } = require('../models');
const { sendOTPEmail } = require('../services/emailService');

// ─── Helper: generate 6-digit numeric OTP ───────────────────────────────────
function generateOTPCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── GET /api/auth/admin-exists ──────────────────────────────────────────────
exports.adminExists = async (req, res) => {
  try {
    const count = await Admin.count();
    return res.json({ exists: count > 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/signup ───────────────────────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const count = await Admin.count();
    if (count >= 1) {
      return res.status(403).json({
        success: false,
        message: 'An admin account already exists. Signup is permanently disabled.',
      });
    }

    const { name, email, password } = req.body;
    const password_hash = await bcrypt.hash(password, 12);

    const admin = await Admin.create({ name, email, password_hash, is_verified: false });

    return res.status(201).json({
      success: true,
      message: 'Admin account created. Please log in.',
      adminId: admin.id,
    });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ where: { email } });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const valid = await admin.verifyPassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Invalidate previous unused OTPs
    await OTP.update({ consumed: true }, { where: { admin_id: admin.id, consumed: false } });

    // Generate OTP
    const code = generateOTPCode();
    const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;
    const expires_at = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await OTP.create({ admin_id: admin.id, code, expires_at });

    // Send email (non-blocking fail allowed in dev)
    try {
      await sendOTPEmail(admin.email, code);
    } catch (emailErr) {
      console.error('[Login] Email send failed:', emailErr.message);
      // Log OTP to console in dev so developer isn't blocked
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔑  DEV OTP for ${admin.email}: ${code}\n`);
      }
    }

    return res.json({
      success: true,
      message: `OTP sent to ${admin.email}. Valid for ${expiresMinutes} minutes.`,
      // Return adminId so the verify step knows which admin to check
      adminId: admin.id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { adminId, code } = req.body;

    const otp = await OTP.findOne({
      where: { admin_id: adminId, code, consumed: false },
      order: [['createdAt', 'DESC']],
    });

    if (!otp) {
      return res.status(401).json({ success: false, message: 'Invalid OTP code.' });
    }

    if (!otp.isValid()) {
      return res.status(401).json({ success: false, message: 'OTP has expired or already been used.' });
    }

    // Consume the OTP
    await otp.update({ consumed: true });

    // Mark admin as verified
    const admin = await Admin.findByPk(adminId);
    if (!admin.is_verified) {
      await admin.update({ is_verified: true });
    }

    // Issue JWT
    const token = jwt.sign(
      { id: admin.id, name: admin.name, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: ['id', 'name', 'email', 'is_verified', 'createdAt'],
    });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found.' });
    return res.json({ success: true, admin });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
