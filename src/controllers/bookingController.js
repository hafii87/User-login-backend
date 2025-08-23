const bookingService = require('../services/bookingService');
const { AppError, errorHandler } = require('../middleware/errorhandler');

const bookCar = async (req, res, next) => {
  try {
    const { carId, startTime, endTime } = req.body;
    if (!carId || !startTime || !endTime) {
      return next(new AppError('carId, startTime, and endTime are required', 400));
    }

    if (!req.user || !req.user._id) {
      return next(new AppError('User authentication failed', 401));
    }

    const booking = await bookingService.bookCar(
      req.user._id,
      carId,
      new Date(startTime),
      new Date(endTime)
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new AppError('User authentication failed', 401));
    }

    const bookings = await bookingService.getUserBookings(req.user._id);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new AppError('User authentication failed', 401));
    }

    const booking = await bookingService.getBookingById(req.params.id);
    if (!booking) return next(new AppError('Booking not found', 404));
    
    const isOwner = String(booking.user._id) === String(req.user._id);
    const isCarOwner = booking.car && String(booking.car.owner) === String(req.user._id);
    
    if (!isOwner && !isCarOwner) {
      return next(new AppError('Unauthorized to view this booking', 403));
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new AppError('User authentication failed', 401));
    }

    const cancelledBooking = await bookingService.cancelBooking(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: cancelledBooking });
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