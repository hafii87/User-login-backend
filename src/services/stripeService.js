const stripe = require('../../config/stripe');
const StripePayment = require('../models/stripeModel');
const Booking = require('../models/bookingModel');


const createPaymentIntent = async (paymentData) => {
  try {
    const { bookingId, userId, amount, carDetails } = paymentData;

    console.log('[Stripe] Creating payment intent:', { bookingId, userId, amount });

    const amountInCents = Math.round(amount * 100);

    if (amountInCents <= 0) {
      throw new Error('Invalid payment amount');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: bookingId,
        userId: userId,
        carMake: carDetails.make || '',
        carModel: carDetails.model || '',
        carYear: carDetails.year ? carDetails.year.toString() : ''
      },
      description: `Car Booking: ${carDetails.make} ${carDetails.model} ${carDetails.year}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('[Stripe] PaymentIntent created:', paymentIntent.id);

    const payment = new StripePayment({
      stripePaymentIntentId: paymentIntent.id,
      bookingId,
      userId,
      amount: amount,
      currency: 'usd',
      status: 'pending'
    });

    await payment.save();

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: amount
    };
  } catch (error) {
    console.error('[Stripe] Error:', error.message);
    throw new Error(`Stripe payment creation failed: ${error.message}`);
  }
};

const cancelPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    console.log('[Stripe] PaymentIntent cancelled:', paymentIntentId);

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status: 'failed' }
    );

    return paymentIntent;
  } catch (error) {
    console.error('[Stripe] Error cancelling:', error.message);
    throw new Error(`Failed to cancel payment: ${error.message}`);
  }
};

const handleWebhookEvent = async (event) => {
  try {
    console.log('[Stripe Webhook] Event type:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCancellation(event.data.object);
        break;

      default:
        console.log('[Stripe Webhook] Unhandled event:', event.type);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error.message);
    throw error;
  }
};

const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    console.log('[Stripe] Payment succeeded for booking:', bookingId);

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date()
      },
      { new: true }
    );

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'succeeded',
        paidAt: new Date()
      }
    );

    console.log('[Stripe] Booking confirmed:', bookingId);
    return booking;
  } catch (error) {
    console.error('[Stripe] Error handling success:', error.message);
    throw error;
  }
};

const handlePaymentFailure = async (paymentIntent) => {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    console.log('[Stripe] Payment failed for booking:', bookingId);

    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'failed',
      status: 'cancelled'
    });

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'failed',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed'
      }
    );

    console.log('[Stripe] Booking cancelled due to payment failure');
  } catch (error) {
    console.error('[Stripe] Error handling failure:', error.message);
    throw error;
  }
};

const handlePaymentCancellation = async (paymentIntent) => {
  try {
    const bookingId = paymentIntent.metadata.bookingId;
    
    console.log('[Stripe] Payment cancelled for booking:', bookingId);

    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'cancelled',
      status: 'cancelled'
    });

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: 'failed' }
    );

    console.log('[Stripe] Booking cancelled');
  } catch (error) {
    console.error('[Stripe] Error handling cancellation:', error.message);
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
      await payment.save();

      await Booking.findByIdAndUpdate(payment.bookingId, {
        status: 'confirmed',
        paymentStatus: 'paid',
        paidAt: new Date()
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
  cancelPaymentIntent,
  handleWebhookEvent,
  confirmPayment,
  getUserPayments
};