const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.use(auth);

// Overall summary across all customers
router.get('/', paymentController.overallSummary);

// Per-customer receipt data
router.get('/:customerId', paymentController.getReceipt);

// Per-customer PDF
router.get('/:customerId/pdf', paymentController.getReceiptPDF);

module.exports = router;
