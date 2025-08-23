const bookingService = require('../services/bookingService');
const { AppError } = require('../middleware/errorhandler');

const bookCar = async (req, res, next) => {
  try {
    const { carId, startTime, endTime } = req.body;
    if (!carId || !startTime || !endTime) {
      return next(new AppError('carId, startTime, and endTime are required', 400));
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
    const bookings = await bookingService.getUserBookings(req.user._id);
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
