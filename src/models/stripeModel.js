const mongoose = require('mongoose');

const stripePaymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  stripeCustomerId: {
    type: String,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'usd',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'cash', 'other'],
    default: 'card'
  },
  paymentMethodDetails: {
    last4: String,
    brand: String,
    expMonth: Number,
    expYear: Number
  },
  paidAt: {
    type: Date
  },
  failureReason: {
    type: String
  },
  errorMessage: {
    type: String
  },
  refundId: {
    type: String,
    index: true
  },
  refundedAt: {
    type: Date
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'canceled']
  },
  refundReason: {
    type: String
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

stripePaymentSchema.index({ booking: 1, status: 1 });
stripePaymentSchema.index({ user: 1, createdAt: -1 });
stripePaymentSchema.index({ stripePaymentIntentId: 1 });
stripePaymentSchema.index({ status: 1, createdAt: -1 });

stripePaymentSchema.virtual('isRefunded').get(function() {
  return this.status === 'refunded' && this.refundId;
});

stripePaymentSchema.methods.canRefund = function() {
  return this.status === 'succeeded' && !this.refundId;
};

stripePaymentSchema.statics.findRefundable = function(bookingId) {
  return this.findOne({
    booking: bookingId,
    status: 'succeeded',
    refundId: { $exists: false }
  });
};

const StripePayment = mongoose.model('StripePayment', stripePaymentSchema);

module.exports = StripePayment;