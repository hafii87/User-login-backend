const stripe = require('../../config/stripe');
const StripePayment = require('../models/stripeModel');
const Booking = require('../models/bookingModel');

const createPaymentIntent = async (bookingId, userId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('user')
      .populate('car')
      .populate('group');

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (!booking.user || !booking.user._id) {
      throw new Error('Booking user is missing or not populated');
    }
    if (booking.user._id.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }

    if (booking.bookingType === 'business') {
      throw new Error('Business bookings do not require payment');
    }

    const totalAmount = booking.totalAmount;
    if (!totalAmount || totalAmount <= 0) {
      throw new Error('Invalid booking amount');
    }

    const amount = Math.round(totalAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        bookingId: bookingId?.toString() || '',
        userId: userId?.toString() || '',
        bookingType: booking.bookingType || '',
        companyCut: booking.companyCut ? booking.companyCut.toString() : '0',
        groupOwnerCut: booking.groupOwnerCut ? booking.groupOwnerCut.toString() : '0',
        carOwnerAmount: booking.carOwnerAmount ? booking.carOwnerAmount.toString() : '0'
      },
      description: booking.car
        ? `Private booking: ${booking.car.make || ''} ${booking.car.model || ''}`
        : `Private booking`
    });

    const payment = new StripePayment({
      stripePaymentIntentId: paymentIntent.id,
      bookingId,
      userId,
      amount: totalAmount,
      currency: 'usd',
      status: 'pending',
      customerEmail: booking.user.email || '',
      customerName: booking.user.username || ''
    });

    await payment.save();
    booking.stripePaymentId = payment._id;
    await booking.save();

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount
    };
  } catch (error) {
    console.error('Stripe createPaymentIntent error:', error.message);
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