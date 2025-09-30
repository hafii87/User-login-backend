const stripe = require('../../config/stripe');
const StripePayment = require('../models/stripeModel');
const Booking = require('../models/bookingModel');

const createPaymentIntent = async (bookingId, userId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('userId')
      .populate('carId');

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.userId._id.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }

    const amount = Math.round(booking.totalAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        bookingId: bookingId.toString(),
        userId: userId.toString()
      },
      description: `Booking payment for ${booking.carId.make} ${booking.carId.model}`
    });

    const payment = new StripePayment({
      stripePaymentIntentId: paymentIntent.id,
      bookingId,
      userId,
      amount: booking.totalAmount,
      currency: 'usd',
      status: 'pending',
      customerEmail: booking.userId.email,
      customerName: booking.userId.username
    });

    await payment.save();

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: booking.totalAmount
    };
  } catch (error) {
    throw error;
  }
};

const confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const payment = await StripePayment.findOne({
      stripePaymentIntentId: paymentIntentId
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (paymentIntent.status === 'succeeded') {
      payment.status = 'succeeded';
      payment.paidAt = new Date();

      if (paymentIntent.charges?.data[0]?.payment_method_details?.card) {
        const card = paymentIntent.charges.data[0].payment_method_details.card;
        payment.paymentMethod = {
          last4: card.last4,
          brand: card.brand
        };
      }

      await payment.save();

      await Booking.findByIdAndUpdate(payment.bookingId, {
        status: 'confirmed',
        paymentStatus: 'paid'
      });
    }

    return payment;
  } catch (error) {
    throw error;
  }
};

const getUserPayments = async (userId) => {
  try {
    const payments = await StripePayment.find({ userId })
      .populate('bookingId')
      .sort({ createdAt: -1 });

    return payments;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getUserPayments
};
