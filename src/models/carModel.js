const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },   
    isBookable: { type: Boolean, default: true },   
    location: String,
    price: { type: Number, required: true },
    licenseNumber: { type: String, required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    isDeleted: { type: Boolean, default: false },
    bookingPreferences: {                           
        minBookingHours: { type: Number, default: 1 },
        maxBookingDays: { type: Number, default: 7 },
        advanceBookingDays: { type: Number, default: 30 },
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
