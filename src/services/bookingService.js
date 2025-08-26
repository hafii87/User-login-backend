const { AppError } = require('../middleware/errorhandler');
const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');

module.exports = {
  async bookCar(userId, carId, startTime, endTime) {
    console.log('- userId:', userId);
    console.log('- carId:', carId);
    console.log('- startTime:', startTime);
    console.log('- endTime:', endTime);

    if (!userId || !carId || !startTime || !endTime) {
      console.log('ERROR: Missing required parameters');
      throw new AppError('All booking parameters are required', 400);
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    
    console.log('Parsed dates:');
    console.log('- start:', start);
    console.log('- end:', end);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.log('ERROR: Invalid date format');
      throw new AppError('Invalid date format for startTime or endTime', 400);
    }

    if (start >= end) {
      console.log('ERROR: Start time not before end time');
      throw new AppError('Start time must be before end time', 400);
    }

    if (start < new Date()) {
      console.log('ERROR: Trying to book in the past');
      throw new AppError('Cannot book in the past', 400);
    }

    console.log('Date validations passed');

    console.log('Checking car availability...');
    const car = await carWrapper.getCarById(carId);
    if (!car) {
      console.log('ERROR: Car not found');
      throw new AppError('Car not found', 404);
    }

    console.log('Car found:', {
      make: car.make,
      model: car.model,
      isActive: car.isActive,
      isDeleted: car.isDeleted,
      isAvailable: car.isAvailable
    });

    if (!car.isActive || car.isDeleted || !car.isAvailable) {
      console.log('ERROR: Car not available for booking');
      throw new AppError('Car is not available for booking', 400);
    }

    console.log('Car is available, checking for overlapping bookings...');

    const overlapping = await bookingWrapper.findOverlapping(carId, startTime, endTime);
    console.log('Overlapping bookings found:', overlapping?.length || 0);
    
    if (overlapping && overlapping.length > 0) {
      console.log('ERROR: Overlapping bookings exist:', overlapping);
      throw new AppError('Car is already booked for this time range', 400);
    }

    console.log('No overlapping bookings, creating booking...');

    const bookingData = {
      user: userId,
      car: carId,
      startTime: start,
      endTime: end,
      status: 'confirmed',
    };

    console.log('Creating booking with data:', bookingData);

    try {
      const booking = await bookingWrapper.createBooking(bookingData);
      console.log('Booking created successfully:', booking);
      console.log('=== BOOKING SERVICE END ===');
      return booking;
    } catch (error) {
      console.log('ERROR: Failed to create booking:', error.message);
      throw error;
    }
  },

  async getUserBookings(userId) {
    console.log('Getting bookings for user:', userId);
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }
    
    try {
      const bookings = await bookingWrapper.getUserBookings(userId);
      console.log(`Found ${bookings?.length || 0} bookings for user`);
      return bookings;
    } catch (error) {
      console.log('ERROR: Failed to get user bookings:', error.message);
      throw error;
    }
  },

  async getBookingById(bookingId) {
    console.log('Getting booking by ID:', bookingId);
    if (!bookingId) {
      throw new AppError('Booking ID is required', 400);
    }

    try {
      const booking = await bookingWrapper.getBookingById(bookingId);
      if (!booking) {
        console.log('ERROR: Booking not found');
        throw new AppError('Booking not found', 404);
      }
      console.log('Booking found:', booking._id);
      return booking;
    } catch (error) {
      console.log('ERROR: Failed to get booking:', error.message);
      throw error;
    }
  },

  async cancelBooking(bookingId, userId) {
    console.log('Cancelling booking:', bookingId, 'for user:', userId);
    
    if (!bookingId || !userId) {
      throw new AppError('Booking ID and User ID are required', 400);
    }

    try {
      const booking = await bookingWrapper.getBookingById(bookingId);
      if (!booking) {
        console.log('ERROR: Booking not found for cancellation');
        throw new AppError('Booking not found', 404);
      }

      console.log('Booking owner:', booking.user._id);
      console.log('Requesting user:', userId);

      if (String(booking.user._id) !== String(userId)) {
        console.log('ERROR: User not authorized to cancel this booking');
        throw new AppError('You can only cancel your own bookings', 403);
      }

      if (booking.status === 'cancelled') {
        console.log('ERROR: Booking already cancelled');
        throw new AppError('Booking is already cancelled', 400);
      }

      const cancelled = await bookingWrapper.cancelBooking(bookingId);
      console.log('Booking cancelled successfully');
      return cancelled;
    } catch (error) {
      console.log('ERROR: Failed to cancel booking:', error.message);
      throw error;
    }
  }
};