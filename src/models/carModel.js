const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    available: { type: Boolean, default: true },
    location: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Car', carSchema);