const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(auth);

router.post(
  '/',
  [
    body('customer_id').notEmpty().withMessage('customer_id is required.'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive.'),
  ],
  validate,
  paymentController.recordPayment
);

module.exports = router;
