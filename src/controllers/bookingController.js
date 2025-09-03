const bookingService = require('../services/bookingService');
const User = require('../models/UserModel');
const Car = require('../models/CarModel');
const { AppError } = require('../middleware/errorhandler');
const agenda = require('../jobs/agenda');
const { convertToUTC, convertFromUTC ,isValidTimezone  } = require('../utils/timezoneUtils');

const bookCar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { carId, startTime, endTime } = req.body;

    if (!userId) return next(new AppError('userId is required', 400));
    if (!carId) return next(new AppError('carId is required', 400));
    if (!startTime) return next(new AppError('startTime is required', 400));
    if (!endTime) return next(new AppError('endTime is required', 400));

    let userTimezone = req.body.timezone || req.user.timezone || 'Asia/Karachi';

    if(!isValidTimezone(userTimezone)) {
        return next(new AppError('Invalid timezone', 400));
    }

    const startTimeUTC = convertToUTC(startTime, userTimezone);
    const endTimeUTC = convertToUTC(endTime, userTimezone);

    if (new Date(startTime) >= new Date(endTime)) {
        return next(new AppError('Invalid booking time', 400));
    }

    if (new Date(startTime) < new Date()) {
        return next(new AppError('Invalid booking time', 400));
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

    await Car.findByIdAndUpdate(carId, { isAvailable: false });

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
      startTimelocal: convertfromUTC(booking.startTime, timezone),
      endTimelocal: convertfromUTC(booking.endTime, timezone),
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

    if (!bookingId) return next(new AppError('bookingId is required', 400));
    if (!newEndTime) return next(new AppError('newEndTime is required', 400));

    const booking = await bookingService.getBookingById(bookingId);
    const newEndTimeUTC = convertToUTC(newEndTime, booking.bookingTimezone);
    const updatedBooking = await bookingService.extendBooking(
      bookingId,
      req.user.id,
      newEndTimeUTC
    );

    if (!updatedBooking) return next(new AppError('Booking not found', 404));

    if(newEndTimeUTC <= booking.endTime) {
      return next(new AppError('New end time must be later than current end time', 400));
    }
    if(newEndTimeUTC > booking.endTime) {
      return next(new AppError('New end time must be later than current end time', 400));
    }

    await agenda.cancel({ "data.bookingId": bookingId, name: "end booking" });

    await agenda.schedule(new Date(newEndTimeUTC), "end booking", {
      bookingId: bookingId,
      carId: updatedBooking.car._id || updatedBooking.car, 
    });

    const responseBooking = {
  ...booking.toObject(),
  startTimeLocal: convertFromUTC(booking.startTime, timezone),
  endTimeLocal: convertFromUTC(booking.endTime, timezone),
};

    res.status(200).json({
      success: true,
      message: 'Booking extended successfully',
      data: responseBooking
    });
  } catch (error) {
    console.log('Extend booking error:', error.message);
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