const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');

const {
  createPaymentIntent,
  createCheckoutSession,
  confirmPayment,
  getPaymentHistory
} = require('../controllers/stripeController');


router.post('/create-payment-intent', verifyToken, createPaymentIntent);
router.post('/create-checkout-session', verifyToken, createCheckoutSession);
router.post('/confirm-payment', verifyToken, confirmPayment);
router.get('/payment-history', verifyToken, getPaymentHistory);

module.exports = router;