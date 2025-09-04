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
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
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
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming',
  },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
