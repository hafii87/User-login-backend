const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');

module.exports = {
  async bookCar(userId, carId, startTime, endTime) {
    const car = await carWrapper.getCarById(carId);
    if (!car || !car.isActive || car.isDeleted || !car.isAvailable) {
      throw new Error('Car is not available for booking');
    }

    const overlapping = await bookingWrapper.findOverlapping(carId, startTime, endTime);
    if (overlapping && overlapping.length > 0) {
      throw new Error('Car is already booked for this time range');
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
      throw new Error('Booking not found');
    }
    return booking;
  },

  async cancelBooking(bookingId, userId) {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (String(booking.user._id) !== String(userId)) {
      throw new Error('You can only cancel your own bookings');
    }

    return bookingWrapper.cancelBooking(bookingId);
  }
};
