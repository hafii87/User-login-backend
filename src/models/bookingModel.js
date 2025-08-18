const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: [true, 'Car reference is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Booking user is required']
  },
  startTime: {
    type: Date,
    required: [true, 'Booking start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'Booking end time is required'],
    validate: {
      validator: function (value) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

bookingSchema.index({ car: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
 
