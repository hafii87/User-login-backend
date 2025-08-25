const Booking = require('../models/bookingModel');

const createBooking = async (data) => {
  return await Booking.create(data);
};

const findOverlapping = async (carId, startTime, endTime) => {
  return await Booking.find({
    car: carId,
    status: 'confirmed',
    startTime: { $lt: endTime },   
    endTime: { $gt: startTime },   
  });
};

const getUserBookings = async (userId) => {
  return await Booking.find({ user: userId }).populate('car');
};

const getBookingById = async (bookingId) => {
  return await Booking.findById(bookingId).populate('car user');
};

const cancelBooking = async (bookingId) => {
  return await Booking.findByIdAndUpdate(
    bookingId,
    { status: 'cancelled' },
    { new: true }
  );
};

module.exports = {
  createBooking,
  findOverlapping,
  getUserBookings,
  getBookingById,
  cancelBooking,
};
