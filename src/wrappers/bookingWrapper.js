const Booking = require('../models/bookingModel');
const { AppError } = require('../middleware/errorhandler');

const createBooking = async (data) => {
  try {
    return await Booking.create(data);
  } catch (err) {
    throw new AppError(`Failed to create booking: ${err.message}`, 400);
  }
};

const findOverlapping = async (carId, startTime, endTime) => {
  try {
    return await Booking.find({
      car: carId,
      status: 'confirmed',
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $lte: endTime, $gt: startTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });
  } catch (err) {
    throw new AppError(`Error checking overlapping bookings: ${err.message}`, 500);
  }
};

const getUserBookings = async (userId) => {
  try {
    return await Booking.find({ user: userId }).populate('car');
  } catch (err) {
    throw new AppError(`Error fetching user bookings: ${err.message}`, 500);
  }
};

const getBookingById = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId).populate('car user');
    if (!booking) throw new AppError('Booking not found', 404);
    return booking;
  } catch (err) {
    throw new AppError(`Error finding booking: ${err.message}`, 500);
  }
};

const cancelBooking = async (bookingId) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) throw new AppError('Booking not found', 404);
    return booking;
  } catch (err) {
    throw new AppError(`Failed to cancel booking: ${err.message}`, 400);
  }
};

module.exports = {
  createBooking,
  findOverlapping,
  getUserBookings,
  getBookingById,
  cancelBooking
};
