const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');

const {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory
} = require('../controllers/stripeController');

router.post('/create-payment-intent', verifyToken, createPaymentIntent);
router.post('/confirm-payment', verifyToken, confirmPayment);
router.get('/payment-history', verifyToken, getPaymentHistory);

module.exports = router;