const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
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
    enum: ['individual', 'group'],
    default: 'individual'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  }
}, { 
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
});

bookingSchema.pre('save', function (next) {
  if (this.isModified('endTime') && !this.isNew) {
    this.isExtended = true;
    this.extendedEndTime = this.endTime;
  }

  if (this.group) {
    this.bookingType = 'group';
  } else {
    this.bookingType = 'individual';
  }

  next();
});

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
module.exports = Booking;
