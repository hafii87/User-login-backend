const bookingService = require('../services/bookingService');
const { AppError } = require('../middleware/errorhandler');

const bookCar = async (req, res, next) => {
  try {
    const { carId, userId, startTime, endTime } = req.body;

    if (!carId || !userId || !startTime || !endTime) {
      return next(
        new AppError('carId, userId, startTime, and endTime are required', 400)
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const car = await Car.findById(carId);
    if (!car) {
      return next(new AppError('Car not found', 404));
    }


    const booking = await bookingService.bookCar({
      carId,
      userId,
      startTime,
      endTime,
    });

    res
      .status(201)
      .json({ success: true, message: 'Booking created successfully', data: booking });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return next(new AppError('userId is required to fetch bookings', 400));
    }

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
    const { userId } = req.body;

    if (!userId) {
      return next(new AppError('userId is required to cancel a booking', 400));
    }

    const cancelledBooking = await bookingService.cancelBooking(
      req.params.id,
      userId
    );

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
