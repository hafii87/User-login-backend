const mongoose = require('mongoose'); 
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Booking user is required']
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: [true, 'Booking car is required']
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

module.exports = mongoose.model('Booking', bookingSchema);
