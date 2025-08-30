const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');

const bookCar = async (bookingData) => {
  try {
    const { user: userId, car: carId, startTime, endTime } = bookingData;

    const car = await carWrapper.getCarById(carId);
    if (!car) throw new Error('Car not found');

    const overlaps = await bookingWrapper.findOverlapping(
      carId,
      new Date(startTime),
      new Date(endTime)
    );
    if (overlaps.length > 0) {
      throw new Error('The car is already booked for the selected time range');
    }

    const booking = await bookingWrapper.createBooking({
      user: userId,
      car: carId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'upcoming', 
    });

    return booking;
  } catch (err) {
    throw new Error(`Booking failed: ${err.message}`);
  }
};

const getUserBookings = async (userId) => {
  try {
    return await bookingWrapper.getUserBookings(userId);
  } catch (err) {
    throw new Error(`Error fetching user bookings: ${err.message}`);
  }
};

const getBookingById = async (bookingId) => {
  try {
    return await bookingWrapper.getBookingById(bookingId);
  } catch (err) {
    throw new Error(`Error fetching booking: ${err.message}`);
  }
};

const cancelBooking = async (bookingId, userId) => {
  try {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.user.toString() !== userId.toString()) {
      throw new Error('You can only cancel your own bookings');
    }

    return await bookingWrapper.cancelBooking(bookingId);
  } catch (err) {
    throw new Error(`Error cancelling booking: ${err.message}`);
  }
};

const extendBooking = async (bookingId, userId, newEndTime) => {
  try {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.user.toString() !== userId.toString()) throw new Error('Unauthorized');
    if (new Date(newEndTime) <= new Date(booking.endTime)) {
      throw new Error('New end time must be later');
    }

    const overlaps = await bookingWrapper.findOverlapping(
      booking.car,                
      new Date(booking.endTime),  
      new Date(newEndTime)        
    );
    if (overlaps.length > 0) throw new Error('Car already booked in extended time');

    booking.endTime = new Date(newEndTime);
    return await booking.save();
  } catch (err) {
    throw new Error(`Error extending booking: ${err.message}`);
  }
};

const getCarBookings = async (carId, status = null) => {
  try {
    return await bookingWrapper.getCarBookings(carId, status);
  } catch (err) {
    throw new Error(`Error fetching car bookings: ${err.message}`);
  }
};

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
  extendBooking,
  getCarBookings,
};
