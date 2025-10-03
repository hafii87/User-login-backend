const emailService = require('../services/emailService');
const bookingService = require('../services/bookingService');
const User = require('../models/userModel');
const Car = require('../models/carModel');
const Booking = require('../models/bookingModel');
const { AppError } = require('../middleware/errorhandler');
const agenda = require('../jobs/agenda');
const { convertToUTC, convertFromUTC, isValidTimezone, formatDateForDisplay } = require('../utils/timezoneUtils');
const mongoose = require('mongoose');

const bookCar = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 'fail', message: 'Authentication required. Please login and provide a valid token.' });
    }
    const userId = req.user.id;
    const { carId, startTime, endTime, timezone, bookingType } = req.body;

    if (!userId) return next(new AppError('userId is required', 400));
    if (!carId) return next(new AppError('carId is required', 400));
    if (!startTime) return next(new AppError('startTime is required', 400));
    if (!endTime) return next(new AppError('endTime is required', 400));
    if (!mongoose.Types.ObjectId.isValid(carId)) return next(new AppError(`Invalid car ID format: ${carId}`, 400));

    if (bookingType && !['business', 'private'].includes(bookingType)) {
      return next(new AppError('Invalid booking type. Must be "business" or "private"', 400));
    }

    const userTimezone = timezone || req.user?.timezone || 'Asia/Karachi';
    if (!isValidTimezone(userTimezone)) return next(new AppError('Invalid timezone', 400));

    const startTimeUTC = convertToUTC(startTime, userTimezone);
    const endTimeUTC = convertToUTC(endTime, userTimezone);

    if (new Date(startTimeUTC) >= new Date(endTimeUTC)) return next(new AppError('End time must be after start time', 400));
    if (new Date(startTimeUTC) < new Date()) return next(new AppError('Start time must be in the future', 400));

    const car = await Car.findOne({ _id: carId, isDeleted: { $ne: true } }).populate('owner', 'username email');
    if (!car) return next(new AppError(`Car with ID ${carId} not found or has been deleted`, 400));

    if (!car.isAvailable) return next(new AppError(`Car ${car.make} ${car.model} is currently not available`, 400));
    if (!car.isBookable) return next(new AppError(`Car ${car.make} ${car.model} is not accepting bookings at this time`, 400));

    const result = await bookingService.bookCar({
      user: userId,
      car: carId,
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      bookingTimezone: userTimezone,
      bookingType: bookingType || 'private'
    });

    const booking = result.booking;

    await booking.populate([
      { path: 'car', select: 'make model year price owner licenseNumber' },
      { path: 'user', select: 'username email' }
    ]);

    await agenda.schedule(new Date(startTimeUTC), "start booking", { bookingId: booking.id, carId });
    await agenda.schedule(new Date(endTimeUTC), "end booking", { bookingId: booking.id, carId });

    const responseBooking = {
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone),
      car: {
        id: car._id,
        make: car.make,
        model: car.model,
        year: car.year,
        licenseNumber: car.licenseNumber
      }
    };

    if (booking.bookingType === 'business') {
      await emailService.sendBusinessBookingConfirmation(req.user.email, responseBooking);
    } else {
      await emailService.sendPrivateBookingConfirmation(req.user.email, responseBooking);
    }

    if (result.paymentIntent) {
      return res.status(201).json({
        success: true,
        message: 'Booking created. Payment required.',
        data: {
          booking: responseBooking,
          payment: {
            clientSecret: result.paymentIntent.clientSecret,
            paymentIntentId: result.paymentIntent.paymentIntentId,
            amount: result.paymentIntent.amount
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: booking.bookingType === 'business' 
        ? 'Business booking confirmed (no payment required)' 
        : 'Booking created successfully. Confirmation email sent!',
      data: responseBooking
    });

  } catch (error) {
    next(new AppError(error.message || 'Failed to create booking', 400));
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userTimezone = req.query.timezone || req.user?.timezone || 'Asia/Karachi';
    if (!isValidTimezone(userTimezone)) return next(new AppError('Invalid timezone', 400));

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
    const userTimezone = req.query.timezone || req.user?.timezone || 'Asia/Karachi';
    if (!isValidTimezone(userTimezone)) return next(new AppError('Invalid timezone', 400));

    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    const bookingWithLocalTime = {
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    };

    res.status(200).json({ success: true, data: bookingWithLocalTime, timezone: userTimezone });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch booking', 400));
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user?.id;
    if (!bookingId || !bookingId.match(/^[0-9a-fA-F]{24}$/)) return next(new AppError('Invalid booking ID', 400));

    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));
    if (!['upcoming'].includes(booking.status)) return next(new AppError(`Booking cannot be cancelled. Current status: ${booking.status}`, 400));

    const bookingUserId = booking.user?._id ? booking.user._id : booking.user;
    if (!bookingUserId) return next(new AppError('Invalid booking user reference', 400));
    if (bookingUserId !== userId) return next(new AppError('You can only cancel your own bookings', 403));

    booking.status = 'cancelled';
    const updatedBooking = await booking.save();

    await agenda.cancel({ $or: [{ "data.bookingId": bookingId }, { "data.bookingId": bookingId}] });
    if (booking.car) await Car.findByIdAndUpdate(booking.car._id || booking.car, { isAvailable: true });

    await emailService.sendCancellationEmail(req.user.email, updatedBooking);

    res.status(200).json({ success: true, message: 'Booking cancelled successfully. Confirmation email sent!', data: updatedBooking });
  } catch (error) {
    next(new AppError(error.message || 'Failed to cancel booking', 500));
  }
};

const extendBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { newEndTime } = req.body;
    if (!bookingId || !newEndTime) return next(new AppError('Booking ID and new end time are required', 400));

    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    const userTimezone = booking.bookingTimezone || 'Asia/Karachi';
    const newEndTimeUTC = convertToUTC(newEndTime, userTimezone);
    if (new Date(newEndTimeUTC) <= new Date(booking.endTime)) return next(new AppError('New end time must be later than current booking end time', 400));

    const bookingUserId = booking.user?._id ? booking.user._id : booking.user;
    if (!bookingUserId) return next(new AppError('Invalid booking user reference', 400));
    if (bookingUserId !== req.user.id) return next(new AppError('Unauthorized to extend this booking', 403));

    const updatedBooking = await bookingService.extendBooking(bookingId, req.user.id, newEndTimeUTC);

    await agenda.cancel({ "data.bookingId": bookingId, name: "end booking" });
    await agenda.schedule(new Date(newEndTimeUTC), "end booking", { bookingId, carId: booking.car._id || booking.car });

    const responseBooking = {
      ...updatedBooking.toObject(),
      startTimeLocal: convertFromUTC(updatedBooking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(updatedBooking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(updatedBooking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(updatedBooking.endTime, userTimezone)
    };

    res.status(200).json({ success: true, message: 'Booking extended successfully', data: responseBooking });
  } catch (error) {
    next(new AppError(error.message || 'Failed to extend booking', 400));
  }
};

const getCarBookings = async (req, res, next) => {
  try {
    const carId = req.params.id;
    const userTimezone = req.query.timezone || req.user?.timezone || 'Asia/Karachi';
    if (!isValidTimezone(userTimezone)) return next(new AppError('Invalid timezone', 400));

    const bookings = await bookingService.getCarBookings(carId);
    const bookingsWithLocalTime = bookings.map(booking => ({
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    }));

    res.status(200).json({ success: true, count: bookingsWithLocalTime.length, data: bookingsWithLocalTime, timezone: userTimezone });
  } catch (error) {
    next(new AppError(error.message || 'Failed to fetch car bookings', 400));
  }
};

const bookGroupCar = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { carId, groupId, startTime, endTime, timezone, bookingType } = req.body;
    if (!userId || !carId || !groupId || !startTime || !endTime) return next(new AppError('All fields are required for group booking', 400));

    if (bookingType && !['business', 'private'].includes(bookingType)) {
      return next(new AppError('Invalid booking type. Must be "business" or "private"', 400));
    }

    const userTimezone = timezone || req.user?.timezone || 'Asia/Karachi';
    if (!isValidTimezone(userTimezone)) return next(new AppError('Invalid timezone', 400));

    const startTimeUTC = convertToUTC(startTime, userTimezone);
    const endTimeUTC = convertToUTC(endTime, userTimezone);
    if (new Date(startTimeUTC) >= new Date(endTimeUTC)) return next(new AppError('End time must be after start time', 400));
    if (new Date(startTimeUTC) < new Date()) return next(new AppError('Start time must be in the future', 400));

    const result = await bookingService.bookGroupCar({
      user: userId,
      car: carId,
      group: groupId,
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      bookingTimezone: userTimezone,
      bookingType: bookingType || 'private'
    });

    const booking = result.booking;

    await agenda.schedule(new Date(startTimeUTC), "start booking", { bookingId: booking.id, carId });
    await agenda.schedule(new Date(endTimeUTC), "end booking", { bookingId: booking.id, carId });

    const responseBooking = {
      ...booking.toObject(),
      startTimeLocal: convertFromUTC(booking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(booking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(booking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(booking.endTime, userTimezone)
    };

    if (booking.bookingType === 'business') {
      await emailService.sendBusinessBookingConfirmation(req.user.email, responseBooking);
    } else {
      await emailService.sendPrivateBookingConfirmation(req.user.email, responseBooking);
    }

    if (result.paymentIntent) {
      return res.status(201).json({
        success: true,
        message: 'Group booking created. Payment required.',
        data: {
          booking: responseBooking,
          payment: {
            clientSecret: result.paymentIntent.clientSecret,
            paymentIntentId: result.paymentIntent.paymentIntentId,
            amount: result.paymentIntent.amount
          }
        }
      });
    }

    res.status(201).json({ 
      success: true, 
      message: booking.bookingType === 'business' 
        ? 'Business group booking confirmed (no payment required)' 
        : 'Group car booking created successfully', 
      data: responseBooking 
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to create group booking', 400));
  }
};

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
  extendBooking,
  getCarBookings,
  bookGroupCar
};
