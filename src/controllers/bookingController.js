const bookingService = require('../services/bookingService');
const User = require('../models/UserModel');
const Car = require('../models/CarModel');
const { AppError } = require('../middleware/errorhandler');

const bookCar = async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request user:', req.user);
    console.log('User ID from token:', req.user?._id);
    
    const { carId, startTime, endTime } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      console.log('ERROR: No user ID found in token');
      return next(new AppError('Authentication failed - no user ID', 401));
    }

    if (!carId || !startTime || !endTime) {
      console.log('ERROR: Missing required fields');
      console.log('carId:', carId, 'startTime:', startTime, 'endTime:', endTime);
      return next(
        new AppError('carId, startTime, and endTime are required', 400)
      );
    }

    console.log('All validations passed, calling booking service...');

    const car = await Car.findById(carId);
    if (!car) {
      return next(new AppError('Car not found', 404));
    }

    console.log('Car found:', car.make, car.model);

    const booking = await bookingService.bookCar(userId, carId, startTime, endTime);

    console.log('Booking created successfully:', booking);
    console.log('=== BOOKING DEBUG END ===');

    res.status(201).json({ 
      success: true, 
      message: 'Booking created successfully', 
      data: booking 
    });
  } catch (error) {
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    next(new AppError(error.message, 400));
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const bookings = await bookingService.getUserBookings(userId);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    if (!booking) return next(new AppError('Booking not found', 404));
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cancelledBooking = await bookingService.cancelBooking(req.params.id, userId);
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: cancelledBooking,
    });
  } catch (error) {
    if (error.message === 'You can only cancel your own bookings') {
      return next(new AppError(error.message, 403));
    }
    next(new AppError(error.message, 404));
  }
};

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
};