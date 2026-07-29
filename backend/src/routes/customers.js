const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const CATEGORIES = ['insurance', 'permit', 'fitness_puc', 'license'];

const customerValidation = [
  body('name').trim().notEmpty().withMessage('Customer name is required.'),
  body('contact_number')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required.')
    .matches(/^[+\d][\d\s\-]{7,19}$/)
    .withMessage('Invalid contact number format.'),
  body('category')
    .isIn(CATEGORIES)
    .withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  body('amount_total')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a non-negative number.'),
  body('amount_paid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount paid must be a non-negative number.'),
];

// All routes require auth
router.use(auth);

router.get('/expiring-soon', customerController.expiringSoon);
router.get('/', customerController.list);
router.post('/', customerValidation, validate, customerController.create);
router.get('/:id', customerController.getOne);
router.put('/:id', customerValidation, validate, customerController.update);
router.delete('/:id', customerController.remove);
router.post('/:id/send-reminder', customerController.sendReminder);

module.exports = router;
