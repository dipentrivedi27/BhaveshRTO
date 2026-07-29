const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// GET /api/auth/admin-exists — public, used by frontend to gate sign-up page
router.get('/admin-exists', authController.adminExists);

// POST /api/auth/signup — public, one-time only
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  authController.signup
);

// POST /api/auth/login — public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  authController.login
);

// POST /api/auth/verify-otp — public
router.post(
  '/verify-otp',
  [
    body('adminId').notEmpty().withMessage('adminId is required.'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('6-digit OTP code is required.'),
  ],
  validate,
  authController.verifyOTP
);

// GET /api/auth/me — protected
router.get('/me', auth, authController.me);

module.exports = router;
