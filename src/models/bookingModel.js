const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking user is required'],
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: [true, 'Booking car is required'],
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null
    },
    startTime: {
      type: Date,
      required: [true, 'Booking start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'Booking end time is required'],
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    isExtended: {
      type: Boolean,
      default: false,
    },
    extendedEndTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'pending_payment', 'confirmed', 'upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    isStarted: {
      type: Boolean,
      default: false,
    },
    bookingTimezone: {
      type: String,
      default: 'Asia/Karachi',
    },
    bookingType: {
      type: String,
      enum: ['private', 'public', 'business', 'group', 'individual'],
      required: true,
      default: 'private'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'free'],
      default: 'pending'
    },
    paymentType: {
      type: String,
      enum: ['one-time', 'subscription'],
      default: 'one-time'
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    companyCut: {
      type: Number,
      default: 0
    },
    groupOwnerCut: {
      type: Number,
      default: 0
    },
    carOwnerCut: {
      type: Number,
      default: 0
    },
    stripePaymentId: {
      type: String,
      default: 'stripePayment'
    },
    stripePaymentIntentId: {
      type: String,
      default: null
    },
    stripeSubscriptionId: {
      type: String,
      default: null
    },
    stripeCheckoutSessionId: {
      type: String,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    },
    refundedAmount: {
      type: Number,
      default: 0
    },
    refundedAt: {
      type: Date,
      default: null
    },
    refundReason: {
      type: String,
      default: null
    },
    googleCalendarEventId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      }
    },
    toObject: { virtuals: true }
  }
);

bookingSchema.pre('save', function (next) {
  if (this.isModified('endTime') && !this.isNew) {
    this.isExtended = true;
    this.extendedEndTime = this.endTime;
  }

  if (this.group) {
    this.bookingType = 'group';
  }

  next();
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
module.exports = Booking;