const mongoose = require('mongoose');

const stripePaymentSchema = new mongoose.Schema({
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    last4: String,
    brand: String
  },
  stripeCustomerId: {
  type: String,
  required: true
},

  customerEmail: String,
  customerName: String,
  errorMessage: String,
  paidAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('StripePayment', stripePaymentSchema);