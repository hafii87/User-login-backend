const agenda = require('../jobs/agenda');
const mongoose = require('mongoose');
const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');

const bookCar = async (bookingData) => {
  try {
    const { user: userId, car: carId, startTime, endTime, bookingTimezone } = bookingData;

    const car = await carWrapper.getCarById(carId);
    if (!car) {
      throw new Error('Car not found');
    }

    if (!car.isAvailable) {
      throw new Error('Car is not available');
    }

    if (!car.isBookable) {
      throw new Error('Car is not accepting bookings');
    }

    const preferences = car.bookingPreferences || {};
    
    const durationHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    if (durationHours < (preferences.minBookingHours || 1)) {
      throw new Error(`Minimum booking duration is ${preferences.minBookingHours || 1} hours`);
    }
    
    const durationDays = durationHours / 24;
    if (durationDays > (preferences.maxBookingDays || 7)) {
      throw new Error(`Maximum booking duration is ${preferences.maxBookingDays || 7} days`);
    }
    
    const advanceDays = (new Date(startTime) - new Date()) / (1000 * 60 * 60 * 24);
    if (advanceDays > (preferences.advanceBookingDays || 30)) {
      throw new Error(`Cannot book more than ${preferences.advanceBookingDays || 30} days in advance`);
    }
    
    if (preferences.blackoutDates && preferences.blackoutDates.length > 0) {
      const isInBlackout = preferences.blackoutDates.some(blackout => {
        const blackoutStart = new Date(blackout.startDate);
        const blackoutEnd = new Date(blackout.endDate);
        const bookingStart = new Date(startTime);
        const bookingEnd = new Date(endTime);
        
        return bookingStart < blackoutEnd && bookingEnd > blackoutStart;
      });
      
      if (isInBlackout) {
        const conflictingBlackout = preferences.blackoutDates.find(blackout => {
          const blackoutStart = new Date(blackout.startDate);
          const blackoutEnd = new Date(blackout.endDate);
          const bookingStart = new Date(startTime);
          const bookingEnd = new Date(endTime);
          
          return bookingStart < blackoutEnd && bookingEnd > blackoutStart;
        });
        
        throw new Error(`Car is not available during this period: ${conflictingBlackout.reason || 'Blackout period'}`);
      }
    }

    const conflicts = await bookingWrapper.findOverlapping(
      carId,
      new Date(startTime),
      new Date(endTime)
    );
    
    if (conflicts.length > 0) {
      throw new Error('Car already booked for this time slot');
    }

    const booking = await bookingWrapper.createBooking({
      user: userId,
      car: carId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'upcoming',
      bookingTimezone
    });

    return booking;
  } catch (error) {
    throw new Error(`Booking failed: ${error.message}`);
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

    const newEnd = new Date(newEndTimeUTC);
    const start = new Date(booking.startTime);
    const currentEnd = new Date(booking.endTime);

    if (newEnd <= start) {
      throw new Error('New end time must be after booking start time');
    }

    if (newEnd <= currentEnd) {
      throw new Error('New end time must be later than current end time');
    }

    const car = await carWrapper.getCarById(booking.car._id || booking.car);
    const preferences = car.bookingPreferences || {};
    
    const newDurationHours = (newEnd - start) / (1000 * 60 * 60);
    const newDurationDays = newDurationHours / 24;
    
    if (newDurationDays > (preferences.maxBookingDays || 7)) {
      throw new Error(`Extended booking cannot exceed ${preferences.maxBookingDays || 7} days`);
    }

    const carId = booking.car._id ? booking.car._id : booking.car;
    
    const overlapping = await bookingWrapper.findOverlapping(
      carId,
      currentEnd, 
      newEndTimeUTC
    );

    const otherBookings = overlapping.filter(b => b.id.toString() !== booking.id.toString());

    if (otherBookings.length > 0) {
      throw new Error('Cannot extend booking - car already booked during extended period');
    }

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
      startTime,
      endTime
    );

    const relevantOverlaps = excludeBooking
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