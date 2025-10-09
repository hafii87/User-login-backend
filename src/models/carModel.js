const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    make: { 
        type: String,
         required: true 
    },
    model: { 
        type: String,
        required: true 
    },
    year: { 
        type: Number,
        required: true 
    },
    isAvailable: { 
        type: Boolean, 
        default: true 
    },
    isBookable: { 
        type: Boolean, 
        default: true 
    },
    location: { 
        type: String 
    },
    price: { 
        type: Number, 
        required: true 
    },
    licenseNumber: { 
        type: String, 
        required: true, 
        unique: true 
    },
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false 
    },
    pricePerHour: { 
        type: Number,
        required: true, 
        default: 10
    },
    isDeleted: { 
        type: Boolean, 
        default: false 
    },
    allowPrivateBooking: {
        type: Boolean,
        default: false,
        description: 'Whether this car can be booked privately outside of groups.'
    },
    groupBookingSettings: {
    type: Map,
    of: {
    allowPrivateBooking: {
      type: Boolean,
      default: false
    },
    addedAt: {
      type: Date, 
      default: Date.now
    }
    },
    default: {}
    },
    bookingPreferences: {                           
        minBookingHours: { 
            type: Number, 
            default: 1 
        },
        maxBookingDays: { 
            type: Number, 
            default: 7 
        },
        advanceBookingDays: { 
            type: Number, 
            default: 30 
        },
        blackoutDates: [
            {
                startDate: Date,
                endDate: Date,
                reason: String
            }
        ]
    }
}, {
    timestamps: true
});
const Car = mongoose.models.Car || mongoose.model('Car', carSchema, 'cars');

module.exports = Car;
