const bookingService = require('../services/bookingService');
const User = require('../models/UserModel');
const Car = require('../models/CarModel');
const { AppError } = require('../middleware/errorhandler');
const agenda = require('../jobs/agenda');
const { convertToUTC, convertFromUTC, isValidTimezone, formatDateForDisplay } = require('../utils/timezoneUtils');

const bookCar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { carId, startTime, endTime } = req.body;

    if (!userId) return next(new AppError('userId is required', 400));
    if (!carId) return next(new AppError('carId is required', 400));
    if (!startTime) return next(new AppError('startTime is required', 400));
    if (!endTime) return next(new AppError('endTime is required', 400));

    let userTimezone = req.body.timezone || req.user.timezone || 'Asia/Karachi';

    if (!isValidTimezone(userTimezone)) {
        return next(new AppError('Invalid timezone', 400));
    }

    const startTimeUTC = convertToUTC(startTime, userTimezone);
    const endTimeUTC = convertToUTC(endTime, userTimezone);

    if (new Date(startTime) >= new Date(endTime)) {
        return next(new AppError('End time must be after start time', 400));
    }

    if (new Date(startTime) < new Date()) {
        return next(new AppError('Start time must be in the future', 400));
    }

    const booking = await bookingService.bookCar({
      user: userId,
      car: carId,  
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      isStarted: false,
      bookingTimezone: userTimezone,
      status: "upcoming",
    });

    await agenda.schedule(new Date(startTimeUTC), "start booking", {
      bookingId: booking.id,
      carId: carId,
    });

    await agenda.schedule(new Date(endTimeUTC), "end booking", {
      bookingId: booking.id,
      carId: carId,
    });

    const responseBooking = {
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    };

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: responseBooking
    });
  } catch (error) {
    console.error('Controller Error:', error); 
    next(new AppError(error.message || 'Failed to create booking', 400));
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userTimezone = req.query.timezone || req.user.timezone || 'Asia/Karachi';
    
    if (!isValidTimezone(userTimezone)) {
        return next(new AppError('Invalid timezone', 400));
    }

    const bookings = await bookingService.getUserBookings(userId);

    const bookingsWithLocalTime = bookings.map(booking => ({
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    }));

    res.status(200).json({
      success: true,
      count: bookingsWithLocalTime.length,
      data: bookingsWithLocalTime,
      timezone: userTimezone
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch bookings', 400));
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userTimezone = req.query.timezone || req.user.timezone || 'Asia/Karachi';
    
    if (!isValidTimezone(userTimezone)) {
        return next(new AppError('Invalid timezone', 400));
    }

    const booking = await bookingService.getBookingById(bookingId);

    if (!booking) return next(new AppError('Booking not found', 404));

    const bookingWithLocalTime = {
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    };

    res.status(200).json({ 
      success: true, 
      data: bookingWithLocalTime,
      timezone: userTimezone 
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch booking', 400));
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    if (!bookingId) {
      return next(new AppError('Booking ID is required', 400));
    }

    if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid booking ID format', 400));
    }

    const booking = await bookingService.getBookingById(bookingId);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.status === 'cancelled') {
      return next(new AppError('Booking is already cancelled', 400));
    }

    if (booking.status === 'completed') {
      return next(new AppError('Completed bookings cannot be cancelled', 400));
    }
    
    if (booking.status === 'ongoing') {
      return next(new AppError('Ongoing bookings cannot be cancelled', 400));
    }

    const bookingUserId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
    
    if (bookingUserId !== userId) {
      return next(new AppError('You can only cancel your own bookings', 403));
    }

    booking.status = 'cancelled';
    const updatedBooking = await booking.save();

    try {
      const cancelledJobs = await agenda.cancel({ 
        $or: [
          { "data.bookingId": bookingId },
          { "data.bookingId": bookingId.toString() }
        ]
      });
      console.log(`Cancelled ${cancelledJobs} scheduled jobs for booking ${bookingId}`);
    } catch (jobError) {
      console.error('Error cancelling scheduled jobs:', jobError.message);
    }

    if (booking.car) {
      const carId = booking.car._id ? booking.car._id : booking.car;
      await Car.findByIdAndUpdate(carId, { isAvailable: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: updatedBooking
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    return next(new AppError(error.message || 'Failed to cancel booking', 500));
  }
};

const extendBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { newEndTime } = req.body;

    if (!bookingId) {
      return next(new AppError('Booking ID is required', 400));
    }
    if (!newEndTime) {
      return next(new AppError('New end time is required', 400));
    }

    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    console.log('Booking object:', JSON.stringify(booking, null, 2));

    if (!booking.startTime) {
      return next(new AppError('Booking start time is missing', 500));
    }
    if (!booking.endTime) {
      return next(new AppError('Booking end time is missing', 500));
    }

    const userTimezone = booking.bookingTimezone || 'Asia/Karachi';
    const newEndTimeUTC = convertToUTC(newEndTime, userTimezone);

    const newEnd = new Date(newEndTimeUTC);
    const start = new Date(booking.startTime);
    const currentEnd = new Date(booking.endTime);

    if (newEnd <= start) {
      return next(new AppError('New end time must be after booking start time', 400));
    }

    if (newEnd <= currentEnd) {
      return next(new AppError('New end time must be later than current end time', 400));
    }

    const bookingUserId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
    if (bookingUserId !== req.user.id) {
      return next(new AppError('Unauthorized to extend this booking', 403));
    }

    const updatedBooking = await bookingService.extendBooking(
      bookingId,
      req.user.id,
      newEndTimeUTC
    );
    await agenda.cancel({ "data.bookingId": bookingId, name: "end booking" });
    
    const carId = booking.car.id ? booking.car.id : booking.car;
    await agenda.schedule(newEnd, "end booking", {
      bookingId: bookingId,
      carId: carId,
    });

    const responseBooking = {
      ...updatedBooking.toObject(),
      startTimeLocal: convertFromUTC(updatedBooking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(updatedBooking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(updatedBooking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(updatedBooking.endTime, userTimezone),
    };

    res.status(200).json({
      success: true,
      message: 'Booking extended successfully',
      data: responseBooking,
    });
  } catch (error) {
    console.log('Extend booking error:', error.message);
    console.log('Error stack:', error.stack);
    next(new AppError(error.message || 'Failed to extend booking', 400));
  }
};


const getCarBookings = async (req, res, next) => {
  try {
    const carId = req.params.id;
    const userTimezone = req.query.timezone || req.user.timezone || 'Asia/Karachi';
    
    if (!isValidTimezone(userTimezone)) {
        return next(new AppError('Invalid timezone', 400));
    }

    const bookings = await bookingService.getCarBookings(carId);

    const bookingsWithLocalTime = bookings.map(booking => ({
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    }));

    res.status(200).json({
      success: true,
      count: bookingsWithLocalTime.length,
      data: bookingsWithLocalTime,
      timezone: userTimezone
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