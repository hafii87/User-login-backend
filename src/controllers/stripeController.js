const stripeService = require('../services/stripeService');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');

const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user?.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const paymentData = await stripeService.createPaymentIntent(bookingId, userId);

    res.status(200).json({
      success: true,
      message: 'Payment intent created',
      data: paymentData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId, paymentType = 'subscription' } = req.body;
    const userId = req.user?.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    // Fetch user to get email
    const user = await User.findById(userId).select('email');
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'User email not found',
      });
    }

    const booking = await Booking.findById(bookingId).populate('car', 'make model year');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to create payment for this booking',
      });
    }

    if (booking.bookingType === 'business') {
      return res.status(200).json({
        success: true,
        message: 'Business bookings do not require payment',
        data: {
          bookingType: 'business',
          paymentRequired: false
        }
      });
    }

    const checkoutData = await stripeService.createCheckoutSession({
      bookingId: booking._id.toString(),
      userId: userId,
      email: user.email,
      bookingType: booking.bookingType,
      paymentType: paymentType,
      carDetails: {
        make: booking.car.make,
        model: booking.car.model,
        year: booking.car.year
      }
    });

    await Booking.findByIdAndUpdate(bookingId, {
      paymentType: paymentType,
      stripeCheckoutSessionId: checkoutData.sessionId
    });

    res.status(200).json({
      success: true,
      message: 'Checkout session created',
      data: checkoutData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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
  createCheckoutSession,
  confirmPayment,
  getPaymentHistory
};