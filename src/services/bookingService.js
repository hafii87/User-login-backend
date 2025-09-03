const agenda = require('../jobs/agenda');
const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');

const bookCar = async (bookingData) => {
  try {
    const { user: userId, car: carId, startTime, endTime, bookingTimezone } = bookingData;

    const car = await carWrapper.getCarById(carId);
    if (!car) throw new Error('Car not found');

    if (!car.isAvailable) {
      throw new Error('Car is not available');
    }

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
      isStarted: false,
      status: 'upcoming',
      bookingTimezone
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

    const bookingUserId = booking.user.id ? booking.user.id.toString() : booking.user.toString();
    if (bookingUserId !== userId.toString()) {
      throw new Error('You can only cancel your own bookings');
    }

    return await bookingWrapper.cancelBooking(bookingId);
  } catch (err) {
    throw new Error(`Error cancelling booking: ${err.message}`);
  }
};

const extendBooking = async (bookingId, userId, newEndTimeUTC) => {
  try {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const bookingUserId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
    const currentUserId = userId.toString();
    
    if (bookingUserId !== currentUserId) {
      throw new Error('Unauthorized');
    }

    if (new Date(newEndTimeUTC) <= new Date(booking.endTime)) {
      throw new Error('New end time must be later than current end time');
    }

    const carId = booking.car.id ? booking.car.id : booking.car;
    const overlapping = await bookingWrapper.findOverlapping(
      carId,
      booking.endTime,
      newEndTimeUTC
    );

    const otherbookings = overlapping.filter(b => {
      return b.id !== booking.id;
    });
    if (otherbookings.length > 0) throw new Error('Car already booked in extended time');

    const updatedBooking = await bookingWrapper.updateBooking(bookingId, {
      endTime: newEndTimeUTC
    });
    return updatedBooking;
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

const checkCarAvailability = async (carId, startTime, endTime, excludeBooking = null) => {
  try {
    const car = await carWrapper.getCarById(carId);
    if (!car) throw new Error('Car not found');

    const overlaps = await bookingWrapper.findOverlapping(
      carId,
      startTime ,
      endTime
    );

    const relevantOverlaps = excludeBookingId
      ? overlaps.filter(b => {
          return b.id !== excludeBooking.id;
        })
      : overlaps;

    return {
      isAvailable: relevantOverlaps.length === 0,
      conflictingBookings: relevantOverlaps
    };
  } catch (err) {
    throw new Error(`Error checking car availability: ${err.message}`);
  }
};

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
  extendBooking,
  getCarBookings,
  checkCarAvailability
};
