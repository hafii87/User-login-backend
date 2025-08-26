const bookingService = require('../services/bookingService');
const User = require('../models/UserModel');
const Car = require('../models/CarModel');
const { AppError } = require('../middleware/errorhandler');

const bookCar = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { carId, startTime, endTime } = req.body;

    if (!userId) {
      return next(new AppError('userId is required', 400));
    }

    if (!carId) {
      return next(new AppError('carId is required', 400));
    }

    if (!startTime) {
      return next(new AppError('startTime is required', 400));
    }

    if (!endTime) {
      return next(new AppError('endTime is required', 400));
    }

    const booking = await bookingService.bookCar(userId, carId, startTime, endTime);
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to create booking', 400));
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('Fetching bookings for user:', userId);
    
    const bookings = await bookingService.getUserBookings(userId);
    
    res.status(200).json({ 
      success: true, 
      count: bookings.length,
      data: bookings 
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error.message);
    next(new AppError(error.message || 'Failed to fetch bookings', 400));
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    console.log('Fetching booking by ID:', bookingId);
    
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }
    
    res.status(200).json({ 
      success: true, 
      data: booking 
    });
  } catch (error) {
    console.error('Error fetching booking:', error.message);
    next(new AppError(error.message || 'Failed to fetch booking', 400));
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    console.log('Cancelling booking:', bookingId, 'for user:', userId);
    
    const cancelledBooking = await bookingService.cancelBooking(bookingId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: cancelledBooking,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error.message);
    
    if (error.message === 'You can only cancel your own bookings') {
      return next(new AppError(error.message, 403));
    }
    if (error.message === 'Booking not found') {
      return next(new AppError(error.message, 404));
    }
    
    next(new AppError(error.message || 'Failed to cancel booking', 400));
  }
};

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
};