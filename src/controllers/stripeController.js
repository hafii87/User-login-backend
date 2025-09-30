const stripeService = require('../services/stripeService');

const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id; 
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }
    
    const paymentData = await stripeService.createPaymentIntent(bookingId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Payment intent created',
      data: paymentData
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }
    
    const payment = await stripeService.confirmPayment(paymentIntentId);
    
    res.status(200).json({
      success: true,
      message: 'Payment confirmed',
      data: payment
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const payments = await stripeService.getUserPayments(userId);
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory
};