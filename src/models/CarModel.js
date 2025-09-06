const { string } = require('joi');
const { max } = require('moment-timezone');
const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Car owner is required']
  },
  make: {
    type: String,
    required: [true, 'Car make is required'],
    trim: true
  },
  model: {
    type: String, 
    required: [true, 'Car model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Car year is required'],
    min: [1886, 'Year must be 1886 or later'],
    max: [new Date().getFullYear() + 1, 'Year must be valid']
  },
  price: {
    type: Number,
    required: [true, 'Car price is required'],
    min: [0, 'Price cannot be negative']
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isAvailable: { 
    type: Boolean, 
    default: true 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedAt: { 
    type: Date 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  isBookable: { 
    type: Boolean, 
    default: true,
    index: true
  },
  bookingPreferences: {
    minBookingHours: { type: Number, default: 1, min: 0.5 },
    maxBookingDays: { type: Number, default: 7, min: 1 },
    advanceBookingDays: { type: Number, default: 30, min: 1 },
    blackoutDates: [{ startDate: Date, endDate: Date, reason: String }]
  }
}, { timestamps: true });

const Car = mongoose.model('Car', carSchema);

module.exports = Car;