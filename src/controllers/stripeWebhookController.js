const stripe = require('../../config/stripe');
const Booking = require('../models/bookingModel');
const StripePayment = require('../models/stripeModel');
const emailService = require('../services/emailService');

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    
    case 'payment_intent.canceled':
      await handlePaymentCanceled(event.data.object);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const { id: paymentIntentId, metadata } = paymentIntent;
    const { bookingId, bookingType } = metadata;

    console.log(`Payment succeeded for booking ${bookingId}, type: ${bookingType}`);

    const payment = await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: 'succeeded',
        paidAt: new Date(),
        paymentMethod: paymentIntent.charges?.data[0]?.payment_method_details?.card ? {
          last4: paymentIntent.charges.data[0].payment_method_details.card.last4,
          brand: paymentIntent.charges.data[0].payment_method_details.card.brand
        } : undefined
      },
      { new: true }
    );

    if (!payment) {
      console.error(`Payment record not found for intent: ${paymentIntentId}`);
      return;
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: 'paid',
        status: 'upcoming' 
      },
      { new: true }
    )
    .populate('user', 'username email')
    .populate('car', 'make model year licenseNumber');

    if (!booking) {
      console.error(`Booking not found: ${bookingId}`);
      return;
    }

    await emailService.sendPaymentConfirmation(
      booking.user.email,
      {
        bookingId: booking._id,
        bookingType: booking.bookingType,
        carDetails: `${booking.car.make} ${booking.car.model} (${booking.car.year})`,
        amount: payment.amount,
        paymentDate: payment.paidAt,
        startTime: booking.startTime,
        endTime: booking.endTime
      }
    );

    console.log(`Booking ${bookingId} payment confirmed successfully`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

const handlePaymentFailure = async (paymentIntent) => {
  try {
    const { id: paymentIntentId, metadata, last_payment_error } = paymentIntent;
    const { bookingId } = metadata;

    console.log(`Payment failed for booking ${bookingId}`);

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: 'failed',
        errorMessage: last_payment_error?.message || 'Payment failed'
      }
    );

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: 'failed' },
      { new: true }
    ).populate('user', 'email');

    if (booking && booking.user) {
      await emailService.sendPaymentFailedEmail(booking.user.email, {
        bookingId: booking._id,
        errorMessage: last_payment_error?.message || 'Payment failed'
      });
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

const handlePaymentCanceled = async (paymentIntent) => {
  try {
    const { id: paymentIntentId, metadata } = paymentIntent;
    const { bookingId } = metadata;

    console.log(`Payment canceled for booking ${bookingId}`);

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status: 'failed' }
    );

    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'pending'
    });
  } catch (error) {
    console.error('Error handling payment cancelation:', error);
  }
};

module.exports = {
  handleStripeWebhook
};