const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.get('/summary', auth, dashboardController.summary);
router.get('/monthly-collection', auth, dashboardController.monthlyCollection);

module.exports = router;
