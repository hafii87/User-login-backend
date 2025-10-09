const stripe = require('../../config/stripe');
const StripePayment = require('../models/stripeModel');
const Booking = require('../models/bookingModel');

const STRIPE_PRICES = {
  subscription: process.env.STRIPE_SUBSCRIPTION_PRICE_ID || 'price_1SE5602Vh6NcFz3IalmDhpRO',
  oneTime: process.env.STRIPE_ONETIME_PRICE_ID || 'price_1SE5602Vh6NcFz3IalmDhpRO'
};

const createCheckoutSession = async (checkoutData) => {
  try {
    const { bookingId, userId, bookingType, carDetails = {}, paymentType = 'subscription', user = {} } = checkoutData;

    if (bookingType === 'business') {
      return { type: 'business', message: 'No payment required for business bookings', paymentRequired: false };
    }

    if (!user.email) {
      throw new Error('User email is required to create checkout session');
    }

    const mode = paymentType === 'subscription' ? 'subscription' : 'payment';
    const priceId = paymentType === 'subscription' ? STRIPE_PRICES.subscription : STRIPE_PRICES.oneTime;

    const session = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking/cancel?booking_id=${bookingId}`,
      metadata: {
        bookingId,
        userId,
        bookingType,
        paymentType,
        carMake: carDetails.make || '',
        carModel: carDetails.model || ''
      },
      customer_email: user.email
    });

    const payment = new StripePayment({
      stripePaymentIntentId: session.id,
      bookingId,
      userId,
      amount: 0,
      currency: 'usd',
      status: 'pending'
    });

    await payment.save();

    return { sessionId: session.id, url: session.url, type: paymentType, paymentRequired: true };
  } catch (error) {
    throw new Error(`Stripe checkout creation failed: ${error.message}`);
  }
};

const createPaymentIntent = async (paymentData) => {
  try {
    const { bookingId, userId, amount, carDetails, userEmail, userName } = paymentData;

    const amountInCents = Math.round(amount * 100);

    if (amountInCents <= 0) {
      throw new Error('Invalid payment amount');
    }

    const customerId = await createOrGetCustomer(userId, userEmail, userName);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: customerId,
      metadata: {
        bookingId: bookingId,
        userId: userId,
        bookingType: carDetails.bookingType || 'private',
        carMake: carDetails.make || '',
        carModel: carDetails.model || '',
        carYear: carDetails.year ? carDetails.year.toString() : ''
      },
      description: `Car Booking: ${carDetails.make} ${carDetails.model} ${carDetails.year}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    const payment = new StripePayment({
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customerId,
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
      amount: amount,
      customerId: customerId
    };
  } catch (error) {
    throw new Error(`Stripe payment creation failed: ${error.message}`);
  }
};

const refundPayment = async (paymentIntentId, bookingId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent.charges || paymentIntent.charges.data.length === 0) {
      throw new Error('No charge found for this payment');
    }

    const chargeId = paymentIntent.charges.data[0].id;

    const refund = await stripe.refunds.create({
      charge: chargeId,
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
        refundedAt: new Date(),
        refundId: refund.id,
        refundedAmount: refund.amount
      }
    );

    return {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      refundedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Stripe refund failed: ${error.message}`);
  }
};

const handleWebhookEvent = async (event) => {
  try {
    switch (event.type) {
      case 'checkout.session.completed': await handleCheckoutCompleted(event.data.object); break;
      case 'customer.subscription.created': await handleSubscriptionCreated(event.data.object); break;
      case 'customer.subscription.updated': await handleSubscriptionUpdated(event.data.object); break;
      case 'customer.subscription.deleted': await handleSubscriptionDeleted(event.data.object); break;
      case 'invoice.payment_succeeded': await handleInvoicePaymentSucceeded(event.data.object); break;
      case 'invoice.payment_failed': await handleInvoicePaymentFailed(event.data.object); break;
      case 'payment_intent.succeeded': await handlePaymentSuccess(event.data.object); break;
      case 'payment_intent.payment_failed': await handlePaymentFailure(event.data.object); break;
      case 'payment_intent.canceled': await handlePaymentCanceled(event.data.object); break;
      case 'charge.refunded': await handleChargeRefunded(event.data.object); break;
    }
    return { received: true };
  } catch (error) {
    throw error;
  }
};

const handleCheckoutCompleted = async (session) => {
  const bookingId = session.metadata.bookingId;
  const paymentType = session.metadata.paymentType || 'subscription';

  const updateData = {
    paymentStatus: 'paid',
    status: 'confirmed',
    paidAt: new Date(),
    paymentType
  };

  if (session.subscription) updateData.stripeSubscriptionId = session.subscription;
  if (session.payment_intent) updateData.stripePaymentIntentId = session.payment_intent;

  await Booking.findByIdAndUpdate(bookingId, updateData, { new: true });
  await StripePayment.findOneAndUpdate({ stripePaymentIntentId: session.id }, { status: 'succeeded', paidAt: new Date() });
};

const handleSubscriptionCreated = async (subscription) => {
  const booking = await Booking.findOne({ stripeSubscriptionId: subscription.id });
  if (booking) {
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    await booking.save();
  }
};

const handleSubscriptionUpdated = async () => {};

const handleSubscriptionDeleted = async (subscription) => {
  const booking = await Booking.findOne({ stripeSubscriptionId: subscription.id });
  if (booking) {
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();
  }
};

const handleInvoicePaymentSucceeded = async (invoice) => {
  const booking = await Booking.findOne({ stripeSubscriptionId: invoice.subscription });
  if (booking) {
    booking.paidAt = new Date();
    booking.paymentStatus = 'paid';
    await booking.save();
  }
};

const handleInvoicePaymentFailed = async (invoice) => {
  const booking = await Booking.findOne({ stripeSubscriptionId: invoice.subscription });
  if (booking) {
    booking.paymentStatus = 'failed';
    await booking.save();
  }
};

const handlePaymentSuccess = async (paymentIntent) => {
  const { id: paymentIntentId, metadata } = paymentIntent;
  const { bookingId } = metadata;

  const payment = await StripePayment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId },
    {
      status: 'succeeded',
      paidAt: new Date(),
      paymentMethod: paymentIntent.charges?.data[0]?.payment_method_details?.card
        ? {
            last4: paymentIntent.charges.data[0].payment_method_details.card.last4,
            brand: paymentIntent.charges.data[0].payment_method_details.card.brand
          }
        : undefined
    },
    { new: true }
  );

  if (!payment) return;

  await Booking.findByIdAndUpdate(
    bookingId,
    { paymentStatus: 'paid', status: 'confirmed', paidAt: new Date() },
    { new: true }
  );
};

const handlePaymentFailure = async (paymentIntent) => {
  const { id: paymentIntentId, metadata, last_payment_error } = paymentIntent;
  const { bookingId } = metadata;

  await StripePayment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId },
    { status: 'failed', errorMessage: last_payment_error?.message || 'Payment failed' }
  );

  await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'failed', status: 'cancelled' });
};

const handlePaymentCanceled = async (paymentIntent) => {
  const { id: paymentIntentId, metadata } = paymentIntent;
  const { bookingId } = metadata;

  await StripePayment.findOneAndUpdate({ stripePaymentIntentId: paymentIntentId }, { status: 'failed' });
  await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'pending', status: 'cancelled' });
};

const handleChargeRefunded = async (charge) => {
  const paymentIntentId = charge.payment_intent;
  
  if (!paymentIntentId) return;

  const payment = await StripePayment.findOneAndUpdate(
    { stripePaymentIntentId: paymentIntentId },
    {
      status: 'refunded',
      refundedAt: new Date(),
      refundedAmount: charge.amount_refunded
    },
    { new: true }
  );

  if (payment && payment.bookingId) {
    await Booking.findByIdAndUpdate(
      payment.bookingId,
      {
        paymentStatus: 'refunded',
        refundedAmount: charge.amount_refunded / 100,
        refundedAt: new Date()
      }
    );
  }
};

const cancelPaymentIntent = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
  await StripePayment.findOneAndUpdate({ stripePaymentIntentId: paymentIntentId }, { status: 'failed' });
  return paymentIntent;
};

const confirmPayment = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const payment = await StripePayment.findOne({ stripePaymentIntentId: paymentIntentId });

  if (!payment) throw new Error('Payment not found');

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
};

const getUserPayments = async (userId) => {
  const payments = await StripePayment.find({ userId }).populate('bookingId').sort({ createdAt: -1 });
  return payments;
};

const createOrGetCustomer = async (userId, userEmail, userName) => {
  try {
    const User = require('../models/userModel');
    const user = await User.findById(userId);
    
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: userEmail,
      name: userName,
      metadata: {
        userId: userId.toString()
      }
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  createCheckoutSession,
  cancelPaymentIntent,
  handleWebhookEvent,
  confirmPayment,
  getUserPayments,
  createOrGetCustomer,
  refundPayment
};