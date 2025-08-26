const { AppError } = require('../middleware/errorhandler');
const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');

const bookCar = async (userId, carId, startTime, endTime) => {
  try {
    
    const car = await carWrapper.getCarById(carId);
    if (!car) {
      throw new Error('Car not found');
    }

    const overlappingBookings = await bookingWrapper.findOverlapping(carId, new Date(startTime), new Date(endTime));
    if (overlappingBookings.length > 0) {
      throw new Error('The car is already booked for the selected time range');
    }

    const bookingData = {
      user: userId,
      car: carId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'pending' 
    };

    const booking = await bookingWrapper.createBooking(bookingData);
    return booking;
  } catch (error) {
    throw new Error(`Booking failed: ${error.message}`);
  }
}

const getUserBookings = async (userId) => {
  try {
    return await bookingWrapper.getUserBookings(userId);
  } catch (error) {
    throw new Error(`Error fetching user bookings: ${error.message}`);
  }
}

const getBookingById = async (bookingId) => {
  try {
    return await bookingWrapper.getBookingById(bookingId);
  } catch (error) {
    throw new Error(`Error fetching booking: ${error.message}`);
  }
}

const cancelBooking = async (bookingId, userId) => {
  try {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.user.toString() !== userId.toString()) {
      throw new Error('You can only cancel your own bookings');
    }
    return await bookingWrapper.cancelBooking(bookingId);
  } catch (error) {
    throw new Error(`Error cancelling booking: ${error.message}`);
  }
}

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
};