const { AppError } = require('../middleware/errorhandler');
const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');

module.exports = {
  async bookCar(userId, carId, startTime, endTime) {
    const car = await carWrapper.getCarById(carId);
    if (!car || !car.isActive || car.isDeleted || !car.isAvailable) {
      throw new AppError('Car is not available for booking', 400);
    }

    const overlapping = await bookingWrapper.findOverlapping(carId, startTime, endTime);
    if (overlapping && overlapping.length > 0) {
      throw new AppError('Car is already booked for this time range', 400);
    }

    return await bookingWrapper.createBooking({
      user: userId,
      car: carId,
      startTime,
      endTime,
      status: 'confirmed',
    });
  },

  async getUserBookings(userId) {
    return bookingWrapper.getUserBookings(userId);
  },

  async getBookingById(bookingId) {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    return booking;
  },

  async cancelBooking(bookingId, userId) {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (String(booking.user._id) !== String(userId)) {
      throw new AppError('You can only cancel your own bookings', 403);
    }

    return bookingWrapper.cancelBooking(bookingId);
  }
};
