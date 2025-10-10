const emailService = require('../services/emailService');
const bookingService = require('../services/bookingService');
const User = require('../models/userModel');
const Car = require('../models/carModel');
const Booking = require('../models/bookingModel');
const { AppError } = require('../middleware/errorhandler');
const agenda = require('../jobs/agenda');
const { convertToUTC, convertFromUTC, isValidTimezone, formatDateForDisplay } = require('../utils/timezoneUtils');
const mongoose = require('mongoose');
const stripeService = require('../services/stripeService');

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

    const reminderStartTime = new Date(new Date(startTimeUTC).getTime() - 10 * 60 * 1000);
    const reminderEndTime = new Date(new Date(endTimeUTC).getTime() - 10 * 60 * 1000);

    if (reminderStartTime > new Date()) {
      await agenda.schedule(reminderStartTime, "booking reminder start", { 
        bookingId: booking.id, 
        userEmail: req.user.email 
      });
    }

    if (reminderEndTime > new Date()) {
      await agenda.schedule(reminderEndTime, "booking reminder end", { 
        bookingId: booking.id, 
        userEmail: req.user.email 
      });
    }

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

    if (result.requiresPayment) {
      return res.status(201).json({
        success: true,
        message: 'Booking created. Payment required to confirm.',
        data: {
          booking: responseBooking,
          paymentRequired: true,
          nextStep: result.nextStep
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
    
    if (!bookingId || !bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid booking ID', 400));
    }

    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    const now = new Date();
    const bookingStartTime = new Date(booking.startTime);
    
    if (now >= bookingStartTime) {
      return next(new AppError('Booking already started — cannot be cancelled.', 400));
    }

    if (booking.status === 'ongoing') {
      return next(new AppError('Cannot cancel an ongoing booking', 400));
    }

    if (!['upcoming', 'pending_payment', 'confirmed'].includes(booking.status)) {
      return next(new AppError(`Booking cannot be cancelled. Current status: ${booking.status}`, 400));
    }

    const bookingUserId = booking.user?._id ? booking.user._id.toString() : booking.user.toString();
    if (!bookingUserId) return next(new AppError('Invalid booking user reference', 400));
    
    if (bookingUserId !== userId.toString()) {
      return next(new AppError('You can only cancel your own bookings', 403));
    }

    const isBeforeStart = now < bookingStartTime;
    let refundProcessed = false;

    if (isBeforeStart && booking.paymentStatus === 'paid' && booking.stripePaymentIntentId) {
      try {
        console.log(`[Refund] Initiating refund for booking ${bookingId}`);
        
        const refundResult = await stripeService.refundPayment(booking.stripePaymentIntentId, booking._id);
        
        booking.paymentStatus = 'refunded';
        booking.refundedAmount = refundResult.amount / 100;
        booking.refundedAt = new Date();
        booking.refundReason = 'Booking cancelled before start time';
        booking.refundId = refundResult.id;
        refundProcessed = true;
        
        console.log(`[Refund]  Successfully processed: $${booking.refundedAmount}`);
      } catch (refundError) {
        console.error('[Refund]  Failed:', refundError.message);
      }
    }

    booking.status = 'cancelled';
    const updatedBooking = await booking.save();

    await agenda.cancel({ 
      $or: [
        { "data.bookingId": bookingId, name: "start booking" },
        { "data.bookingId": bookingId, name: "end booking" },
        { "data.bookingId": bookingId, name: "booking reminder start" },
        { "data.bookingId": bookingId, name: "booking reminder end" }
      ]
    });

    if (booking.car) {
      await Car.findByIdAndUpdate(booking.car._id || booking.car, { isAvailable: true });
    }

    const userTimezone = booking.bookingTimezone || 'Asia/Karachi';
    const bookingWithFormatted = {
      ...updatedBooking.toObject(),
      startTimeFormatted: formatDateForDisplay(updatedBooking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(updatedBooking.endTime, userTimezone)
    };

    await emailService.sendCancellationEmail(req.user.email, bookingWithFormatted);

    let message = 'Booking cancelled successfully. Confirmation email sent!';
    if (refundProcessed) {
      message = `Booking cancelled and refund of $${booking.refundedAmount.toFixed(2)} processed successfully. Confirmation email sent!`;
    }

    res.status(200).json({ 
      success: true, 
      message: message,
      data: {
        ...updatedBooking.toObject(),
        refundProcessed: refundProcessed,
        startTimeFormatted: formatDateForDisplay(updatedBooking.startTime, userTimezone),
        endTimeFormatted: formatDateForDisplay(updatedBooking.endTime, userTimezone)
      }
    });
  } catch (error) {
    next(new AppError(error.message || 'Failed to cancel booking', 500));
  }
};

const extendBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { newEndTime } = req.body;
    
    if (!bookingId || !newEndTime) {
      return next(new AppError('Booking ID and new end time are required', 400));
    }

    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    const oldEndTime = new Date(booking.endTime);
    const userTimezone = booking.bookingTimezone || 'Asia/Karachi';
    const oldEndTimeFormatted = formatDateForDisplay(oldEndTime, userTimezone);

    const newEndTimeUTC = convertToUTC(newEndTime, userTimezone);
    
    if (new Date(newEndTimeUTC) <= new Date(booking.endTime)) {
      return next(new AppError('New end time must be later than current booking end time', 400));
    }

    const bookingUserId = booking.user?._id ? booking.user._id.toString() : booking.user.toString();
    if (!bookingUserId) return next(new AppError('Invalid booking user reference', 400));
    
    if (bookingUserId !== req.user.id.toString()) {
      return next(new AppError('Unauthorized to extend this booking', 403));
    }

    const car = await Car.findOne({ _id: booking.car._id || booking.car, isDeleted: { $ne: true } });
    if (!car) return next(new AppError('Car not found or has been deleted', 400));
    
    if (!car.isAvailable && booking.status !== 'ongoing') {
      return next(new AppError(`Car ${car.make} ${car.model} is currently not available`, 400));
    }
    
    if (!car.isBookable) {
      return next(new AppError(`Car ${car.make} ${car.model} is not accepting bookings at this time`, 400));
    }

    const conflicts = await bookingService.findOverlappingBooking(
      booking.car._id || booking.car, 
      booking.endTime, 
      newEndTimeUTC, 
      booking._id
    );
    
    if (conflicts.length > 0) {
      return next(new AppError('Car already booked during extended period', 400));
    }

    const additionalHours = (new Date(newEndTimeUTC) - oldEndTime) / (1000 * 60 * 60);
    const pricePerHour = car.pricePerHour || 10;
    const additionalCost = booking.bookingType === 'business' ? 0 : additionalHours * pricePerHour;

    const updatedBooking = await bookingService.extendBooking(bookingId, req.user.id, newEndTimeUTC);

    await agenda.cancel({ "data.bookingId": bookingId, name: "end booking" });
    await agenda.cancel({ "data.bookingId": bookingId, name: "booking reminder end" });
    
    await agenda.schedule(new Date(newEndTimeUTC), "end booking", { bookingId, carId: booking.car._id || booking.car });
    
    const newReminderEndTime = new Date(new Date(newEndTimeUTC).getTime() - 10 * 60 * 1000);
    if (newReminderEndTime > new Date()) {
      await agenda.schedule(newReminderEndTime, "booking reminder end", { 
        bookingId, 
        userEmail: req.user.email 
      });
    }

    const responseBooking = {
      ...updatedBooking.toObject(),
      startTimeLocal: convertFromUTC(updatedBooking.startTime, userTimezone),
      endTimeLocal: convertFromUTC(updatedBooking.endTime, userTimezone),
      startTimeFormatted: formatDateForDisplay(updatedBooking.startTime, userTimezone),
      endTimeFormatted: formatDateForDisplay(updatedBooking.endTime, userTimezone),
      oldEndTimeFormatted: oldEndTimeFormatted,
      additionalHours: Math.round(additionalHours * 10) / 10,
      additionalCost: Math.round(additionalCost * 100) / 100
    };

    try {
      await emailService.sendBookingExtensionEmail(req.user.email, responseBooking);
      console.log(`[Extend]  Extension email sent to ${req.user.email}`);
    } catch (emailError) {
      console.error('[Extend]  Failed to send extension email:', emailError.message);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Booking extended successfully. Confirmation email sent!', 
      data: responseBooking 
    });
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

const bookGroupCar = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { carId, groupId, startTime, endTime, timezone, bookingType } = req.body;
    
    if (!userId || !carId || !groupId || !startTime || !endTime) {
      return next(new AppError('All fields are required for group booking', 400));
    }

    if (bookingType && !['business', 'private'].includes(bookingType)) {
      return next(new AppError('Invalid booking type. Must be "business" or "private"', 400));
    }

    const userTimezone = timezone || req.user?.timezone || 'Asia/Karachi';
    if (!isValidTimezone(userTimezone)) return next(new AppError('Invalid timezone', 400));

    const startTimeUTC = convertToUTC(startTime, userTimezone);
    const endTimeUTC = convertToUTC(endTime, userTimezone);
    
    if (new Date(startTimeUTC) >= new Date(endTimeUTC)) {
      return next(new AppError('End time must be after start time', 400));
    }
    
    if (new Date(startTimeUTC) < new Date()) {
      return next(new AppError('Start time must be in the future', 400));
    }

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

    const reminderStartTime = new Date(new Date(startTimeUTC).getTime() - 10 * 60 * 1000);
    const reminderEndTime = new Date(new Date(endTimeUTC).getTime() - 10 * 60 * 1000);

    if (reminderStartTime > new Date()) {
      await agenda.schedule(reminderStartTime, "booking reminder start", { 
        bookingId: booking.id, 
        userEmail: req.user.email 
      });
    }

    if (reminderEndTime > new Date()) {
      await agenda.schedule(reminderEndTime, "booking reminder end", { 
        bookingId: booking.id, 
        userEmail: req.user.email 
      });
    }

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

    if (result.requiresPayment) {
      return res.status(201).json({
        success: true,
        message: 'Group booking created. Payment required to confirm.',
        data: {
          booking: responseBooking,
          paymentRequired: true,
          nextStep: result.nextStep
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