const stripe = require('../../config/stripe');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const StripePayment = require('../models/stripeModel');


const getOrCreateCustomer = async (userId, email, username) => {
  try {
    const user = await User.findById(userId);
    
    if (user.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        if (!customer.deleted) {
          return customer;
        }
      } catch (error) {
        console.log('Stored customer ID invalid, creating new customer');
      }
    }

    const customer = await stripe.customers.create({
      email: email,
      name: username,
      metadata: {
        userId: userId.toString()
      }
    });

    await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
    return customer;
  } catch (error) {
    throw new Error(`Failed to create/retrieve customer: ${error.message}`);
  }
};


const createPaymentIntent = async ({ bookingId, userId, amount, userEmail, userName, carDetails }) => {
  try {
    const customer = await getOrCreateCustomer(userId, userEmail, userName);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customer.id,
      metadata: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        bookingType: carDetails.bookingType || 'private',
        carMake: carDetails.make,
        carModel: carDetails.model,
        carYear: carDetails.year?.toString() || 'N/A'
      },
      description: `Booking for ${carDetails.make} ${carDetails.model} (${carDetails.year})`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await StripePayment.create({
      booking: bookingId,
      user: userId,
      stripePaymentIntentId: paymentIntent.id,
      amount: amount,
      currency: 'usd',
      status: 'pending',
      paymentMethod: 'card'
    });

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: amount,
      customerId: customer.id
    };
  } catch (error) {
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
};

const createCheckoutSession = async ({ bookingId, userId, email, bookingType, paymentType, carDetails }) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const customer = await getOrCreateCustomer(userId, email, booking.user.username || 'User');

    const lineItems = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Car Rental: ${carDetails.make} ${carDetails.model}`,
          description: `${carDetails.year} - Booking ID: ${bookingId}`,
        },
        unit_amount: Math.round(booking.totalAmount * 100),
      },
      quantity: 1,
    }];

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: paymentType === 'subscription' ? 'subscription' : 'payment',
      customer: customer.id,
      success_url: `${process.env.FRONTEND_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/booking-cancelled?booking_id=${bookingId}`,
      metadata: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        bookingType: bookingType || 'private'
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    throw new Error(`Checkout session creation failed: ${error.message}`);
  }
};


const confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: paymentIntent.status,
        paidAt: paymentIntent.status === 'succeeded' ? new Date() : undefined
      }
    );

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100
    };
  } catch (error) {
    throw new Error(`Payment confirmation failed: ${error.message}`);
  }
};


const getUserPayments = async (userId) => {
  try {
    const payments = await StripePayment.find({ user: userId })
      .populate('booking', 'startTime endTime status')
      .sort({ createdAt: -1 });

    return payments;
  } catch (error) {
    throw new Error(`Failed to fetch user payments: ${error.message}`);
  }
};


const cancelPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      { status: 'canceled' }
    );

    console.log(`Payment intent ${paymentIntentId} cancelled successfully`);
    return paymentIntent;
  } catch (error) {
    throw new Error(`Failed to cancel payment intent: ${error.message}`);
  }
};


const refundPayment = async (paymentIntentId, bookingId) => {
  try {
    console.log(`[Refund] Processing refund for payment intent: ${paymentIntentId}`);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Cannot refund payment with status: ${paymentIntent.status}`);
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        bookingId: bookingId.toString(),
        refundReason: 'Booking cancelled before start time'
      }
    });

    await StripePayment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: 'refunded',
        refundId: refund.id,
        refundedAt: new Date(),
        refundAmount: refund.amount / 100,
        refundStatus: refund.status
      }
    );

    console.log(`[Refund] Successfully processed refund ${refund.id} for booking ${bookingId}`);

    return {
      id: refund.id,
      amount: refund.amount, 
      status: refund.status,
      created: refund.created,
      paymentIntentId: paymentIntentId
    };
  } catch (error) {
    console.error(`[Refund] Error processing refund:`, error.message);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
};

const getRefundStatus = async (refundId) => {
  try {
    const refund = await stripe.refunds.retrieve(refundId);
    return {
      id: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      reason: refund.reason
    };
  } catch (error) {
    throw new Error(`Failed to retrieve refund status: ${error.message}`);
  }
};

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  confirmPayment,
  getUserPayments,
  cancelPaymentIntent,
  refundPayment,        
  getRefundStatus,     
  getOrCreateCustomer
};