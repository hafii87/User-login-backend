const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { verifyToken } = require('../middleware/verifyToken');

router.post('/create-payment-intent', verifyToken, stripeController.createPaymentIntent);
router.post('/confirm-payment', verifyToken, stripeController.confirmPayment);
router.get('/payment-history', verifyToken, stripeController.getPaymentHistory);

module.exports = router;