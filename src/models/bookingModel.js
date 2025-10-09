const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true,
    index: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'pending_payment', 'confirmed', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'pending_payment',
    index: true
  },
  bookingTimezone: {
    type: String,
    default: 'Asia/Karachi'
  },
  bookingType: {
    type: String,
    enum: ['business', 'private'],
    default: 'private',
    index: true
  },
  isStarted: {
    type: Boolean,
    default: false
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  companyCut: {
    type: Number,
    default: 0,
    min: 0
  },
  groupOwnerCut: {
    type: Number,
    default: 0,
    min: 0
  },
  carOwnerAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'free', 'refunded'],
    default: 'pending',
    index: true
  },
  paymentType: {
    type: String,
    enum: ['one-time', 'subscription'],
    default: 'one-time'
  },
  stripePaymentIntentId: {
    type: String,
    index: true
  },
  stripeCheckoutSessionId: {
    type: String,
    index: true
  },
  refundedAmount: {
    type: Number,
    min: 0
  },
  refundedAt: {
    type: Date
  },
  refundReason: {
    type: String
  },
  refundId: {
    type: String
  },
  googleCalendarEventId: {
    type: String
  },
  remindersSent: {
    startReminder: {
      type: Boolean,
      default: false
    },
    endReminder: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ car: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ status: 1, startTime: 1 });
bookingSchema.index({ createdAt: -1 });

bookingSchema.virtual('durationHours').get(function() {
  return (this.endTime - this.startTime) / (1000 * 60 * 60);
});

bookingSchema.virtual('isRefundEligible').get(function() {
  const now = new Date();
  const isBeforeStart = now < this.startTime;
  return isBeforeStart && 
         this.paymentStatus === 'paid' && 
         this.stripePaymentIntentId && 
         !this.refundedAmount;
});

bookingSchema.methods.canCancel = function() {
  return ['upcoming', 'pending_payment', 'confirmed', 'pending'].includes(this.status);
};

bookingSchema.methods.canExtend = function() {
  return ['ongoing', 'upcoming'].includes(this.status);
};

bookingSchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

bookingSchema.statics.findOverlapping = function(carId, startTime, endTime, excludeId = null) {
  const query = {
    car: carId,
    status: { $in: ['upcoming', 'ongoing', 'confirmed'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;