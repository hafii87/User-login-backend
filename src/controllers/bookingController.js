const bookingService = require('../services/bookingService');
const User = require('../models/UserModel');
const Car = require('../models/CarModel');
const { AppError } = require('../middleware/errorhandler');
const agenda = require('../jobs/agenda');

const bookCar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { carId, startTime, endTime } = req.body;

    if (!userId) return next(new AppError('userId is required', 400));
    if (!carId) return next(new AppError('carId is required', 400));
    if (!startTime) return next(new AppError('startTime is required', 400));
    if (!endTime) return next(new AppError('endTime is required', 400));

    const booking = await bookingService.bookCar({
      user: userId,
      car: carId,  
      startTime,
      endTime,
      isStarted: false,
      status: "upcoming",
    });

    await Car.findByIdAndUpdate(carId, { isAvailable: false });

    await agenda.schedule(new Date(startTime), "start booking", {
      bookingId: booking.id,
      carId: carId,
    });

    await agenda.schedule(new Date(endTime), "end booking", {
      bookingId: booking.id,
      carId: carId,
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Controller Error:', error); 
    next(new AppError(error.message || 'Failed to create booking', 400));
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bookings = await bookingService.getUserBookings(userId);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch bookings', 400));
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const booking = await bookingService.getBookingById(bookingId);

    if (!booking) return next(new AppError('Booking not found', 404));

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch booking', 400));
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    const cancelledBooking = await bookingService.cancelBooking(bookingId, userId);

    await agenda.cancel({ "data.bookingId": bookingId });

    await Car.findByIdAndUpdate(cancelledBooking.car, { isAvailable: true });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: cancelledBooking,
    });
  } catch (error) {
    if (error.message === 'You can only cancel your own bookings') {
      return next(new AppError(error.message, 403));
    }
    if (error.message === 'Booking not found') {
      return next(new AppError(error.message, 404));
    }
    next(new AppError(error.message || 'Failed to cancel booking', 400));
  }
};

const extendBooking = async (req, res, next) => {
  try {
    const { bookingId, newEndTime } = req.body;

    if (!bookingId) return next(new AppError('bookingId is required', 400));
    if (!newEndTime) return next(new AppError('newEndTime is required', 400));

    const updatedBooking = await bookingService.extendBooking(
      bookingId,
      req.user.id,
      newEndTime
    );

    if (!updatedBooking) return next(new AppError('Booking not found', 404));

    await agenda.cancel({ "data.bookingId": bookingId, name: "end booking" });

    await agenda.schedule(new Date(newEndTime), "end booking", {
      bookingId: bookingId,
      carId: updatedBooking.car, 
    });

    res.status(200).json({
      success: true,
      message: 'Booking extended successfully',
      data: updatedBooking,
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to extend booking', 400));
  }
};

const getCarBookings = async (req, res, next) => {
  try {
    const carId = req.params.id;
    const bookings = await bookingService.getCarBookings(carId);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch car bookings', 400));
  }
};

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
  extendBooking,
  getCarBookings
};