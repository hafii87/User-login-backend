const Booking = require('../models/bookingModel');

module.exports = {
  
  async createBooking(data) {
    return await Booking.create(data);
  },

  async findOverlapping(carId, startTime, endTime) {
    return await Booking.find({
      car: carId,
      status: 'confirmed',
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },   
        { endTime: { $lte: endTime, $gt: startTime } },     
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } } 
      ]
    });
  },

  async getUserBookings(userId) {
    return await Booking.find({ user: userId }).populate('car');
  },


  async getBookingById(bookingId) {
    return await Booking.findById(bookingId).populate('car user');
  },

  
  async cancelBooking(bookingId) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'cancelled' },
      { new: true }
    );
  }
};
