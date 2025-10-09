const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');
const groupWrapper = require('../wrappers/groupWrapper');
const userWrapper = require('../wrappers/userWrapper');
const groupService = require('./groupService');
const stripeService = require('./stripeService');
const googleCalendarService = require('./googleCalendarService');

const findOverlappingBooking = async (carId, startTime, endTime, excludeBookingId = null) => {
  const conflicts = await bookingWrapper.findOverlapping(carId, startTime, endTime, excludeBookingId);
  return conflicts;
};

const calculatePayment = (type, durationHours, pricePerHour, companyPercentage, groupOwnerPercentage = 0) => {
  let totalAmount = 0;
  let companyCut = 0;
  let groupOwnerCut = 0;
  let carOwnerAmount = 0;
  let paymentStatus = 'pending';

  if (type === 'business') {
    totalAmount = 0;
    companyCut = 0;
    groupOwnerCut = 0;
    carOwnerAmount = 0;
    paymentStatus = 'free';
  } else {
    totalAmount = Math.round(pricePerHour * durationHours * 100) / 100;
    companyCut = Math.round((totalAmount * companyPercentage) / 100 * 100) / 100;
    groupOwnerCut = Math.round((totalAmount * groupOwnerPercentage) / 100 * 100) / 100;
    carOwnerAmount = Math.round((totalAmount - companyCut - groupOwnerCut) * 100) / 100;
    paymentStatus = 'pending';
  }

  return { totalAmount, companyCut, groupOwnerCut, carOwnerAmount, paymentStatus };
};

const bookCar = async (bookingData) => {
  const { user: userId, car: carId, startTime, endTime, bookingTimezone, bookingType } = bookingData;
  
  if (!userId || typeof userId !== 'string' || userId.length < 10) {
    throw new Error('Invalid or missing userId for booking creation');
  }

  const car = await carWrapper.getCarById(carId);
  if (!car) throw new Error('Car not found');
  if (!car.isAvailable) throw new Error('Car is not available');
  if (!car.isBookable) throw new Error('Car is not accepting bookings');

  const preferences = car.bookingPreferences || {};
  const durationHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
  
  if (durationHours < (preferences.minBookingHours || 1))
    throw new Error(`Minimum booking duration is ${preferences.minBookingHours || 1} hours`);

  const conflicts = await findOverlappingBooking(carId, startTime, endTime);
  if (conflicts.length > 0) throw new Error('Car already booked for this time slot');

  const type = bookingType || 'private';
  const pricePerHour = car.pricePerHour || 10;
  const companyPercentage = car.companyCommissionPercentage || 10;

  const { totalAmount, companyCut, groupOwnerCut, carOwnerAmount, paymentStatus } =
    calculatePayment(type, durationHours, pricePerHour, companyPercentage);

  let initialStatus = 'pending_payment';
  if (type === 'business') {
    initialStatus = 'confirmed';
  }

  const booking = await bookingWrapper.createBooking({
    user: userId,
    car: carId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: initialStatus,
    bookingTimezone,
    bookingType: type,
    totalAmount,
    companyCut,
    groupOwnerCut,
    carOwnerAmount,
    paymentStatus,
    paymentType: type === 'business' ? 'one-time' : 'subscription'
  });

  if (type === 'private' && totalAmount > 0) {
    try {
      const user = await userWrapper.findById(userId);
      
      const paymentIntent = await stripeService.createPaymentIntent({
        bookingId: booking._id.toString(),
        userId: userId,
        amount: totalAmount,
        userEmail: user.email,
        userName: user.username,
        carDetails: {
          make: booking.car.make,
          model: booking.car.model,
          year: booking.car.year,
          bookingType: type
        }
      });

      await bookingWrapper.updateBooking(booking._id, {
        stripePaymentIntentId: paymentIntent.id
      });

      return {
        booking,
        requiresPayment: true,
        nextStep: 'complete_payment',
        paymentIntent: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: totalAmount,
          customerId: paymentIntent.customerId
        }
      };
    } catch (error) {
      await bookingWrapper.updateBooking(booking._id, {
        status: 'cancelled',
        paymentStatus: 'failed'
      });
      throw new Error(`Payment creation failed: ${error.message}`);
    }
  }

  return { booking, requiresPayment: false };
};

const getUserBookings = async (userId) => {
  return await bookingWrapper.getUserBookings(userId);
};

const getBookingById = async (bookingId) => {
  return await bookingWrapper.getBookingById(bookingId);
};

const cancelBooking = async (bookingId, userId) => {
  const booking = await bookingWrapper.getBookingById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const bookingUserId = booking.user && (booking.user._id ? booking.user._id.toString() : booking.user.toString());
  if (!bookingUserId) throw new Error('Booking user is missing');
  if (bookingUserId !== userId.toString()) throw new Error('You can only cancel your own bookings');

  if (booking.stripePaymentIntentId && booking.paymentStatus === 'pending') {
    try {
      await stripeService.cancelPaymentIntent(booking.stripePaymentIntentId);
    } catch (error) {
      console.error('[cancelBooking] Failed to cancel Stripe payment:', error.message);
    }
  }

  if (booking.googleCalendarEventId) {
    try {
      await googleCalendarService.deleteCalendarEvent(booking.googleCalendarEventId);
    } catch (error) {
      console.error('[cancelBooking] Failed to delete Google Calendar event:', error.message);
    }
  }

  return await bookingWrapper.cancelBooking(bookingId);
};

const extendBooking = async (bookingId, userId, newEndTimeUTC) => {
  const booking = await bookingWrapper.getBookingById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const bookingUserId = booking.user && (booking.user._id ? booking.user._id.toString() : booking.user.toString());
  if (!bookingUserId) throw new Error('Booking user is missing');
  if (bookingUserId !== userId.toString()) throw new Error('Unauthorized');

  const newEnd = new Date(newEndTimeUTC);
  const start = new Date(booking.startTime);
  const currentEnd = new Date(booking.endTime);

  if (newEnd <= start) throw new Error('New end time must be after booking start time');
  if (newEnd <= currentEnd) throw new Error('New end time must be later than current end time');

  const carId = booking.car._id ? booking.car._id : booking.car;
  const car = await carWrapper.getCarById(carId);
  const preferences = car.bookingPreferences || {};

  const newDurationDays = (newEnd - start) / (1000 * 60 * 60 * 24);
  if (newDurationDays > (preferences.maxBookingDays || 7))
    throw new Error(`Extended booking cannot exceed ${preferences.maxBookingDays || 7} days`);

  const overlapping = await findOverlappingBooking(carId, currentEnd, newEndTimeUTC, booking._id);
  if (overlapping.length > 0)
    throw new Error('Cannot extend booking - car already booked during extended period');

  const updatedBooking = await bookingWrapper.updateBooking(bookingId, { endTime: newEndTimeUTC });

  if (booking.googleCalendarEventId) {
    try {
      const user = await userWrapper.findById(userId);
      await googleCalendarService.updateCalendarEvent(booking.googleCalendarEventId, {
        _id: updatedBooking._id,
        car: updatedBooking.car,
        startTime: updatedBooking.startTime,
        endTime: updatedBooking.endTime,
        bookingTimezone: updatedBooking.bookingTimezone,
        status: updatedBooking.status,
        userEmail: user.email
      });
    } catch (error) {
      console.error('[extendBooking] Failed to update Google Calendar event:', error.message);
    }
  }

  return updatedBooking;
};

const getCarBookings = async (carId, status = null) => {
  return await bookingWrapper.getCarBookings(carId, status);
};

const checkCarAvailability = async (carId, startTime, endTime, excludeBookingId = null) => {
  const car = await carWrapper.getCarById(carId);
  if (!car) throw new Error('Car not found');

  const overlaps = await findOverlappingBooking(carId, startTime, endTime, excludeBookingId);

  return {
    isAvailable: overlaps.length === 0,
    conflictingBookings: overlaps
  };
};

const bookGroupCar = async (bookingData) => {
  const { user: userId, car: carId, group: groupId, startTime, endTime, bookingTimezone, bookingType } = bookingData;

  const group = await groupWrapper.getGroupById(groupId);
  if (!group) throw new Error('Group not found');

  const member = group.members.find(m => {
    const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberUserId === userId.toString() && m.status === 'active';
  });
  if (!member) throw new Error('You are not an active member of this group');

  const carInGroup = group.cars.find(carEntry => {
    const carIdInGroup = carEntry.car._id ? carEntry.car._id.toString() : carEntry.car.toString();
    return carIdInGroup === carId.toString();
  });

  if (!carInGroup) throw new Error('Car is not available in this group');

  const type = bookingType || 'private';

  if (type === 'private' && !carInGroup.allowPrivateBooking) {
    throw new Error('Private booking is not allowed for this car in this group. Please contact group admin or book as business.');
  }

  const user = await userWrapper.findById(userId);
  const eligibilityCheck = await groupService.checkUserEligibility(user, group.rules);
  if (!eligibilityCheck.eligible)
    throw new Error(`You don't meet group requirements: ${eligibilityCheck.reasons.join(', ')}`);

  const durationHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
  if (durationHours > group.preferences.maxBookingDuration)
    throw new Error(`Booking duration exceeds group limit of ${group.preferences.maxBookingDuration} hours`);

  const advanceDays = (new Date(startTime) - new Date()) / (1000 * 60 * 60 * 24);
  if (advanceDays > group.preferences.advanceBookingLimit)
    throw new Error(`Cannot book more than ${group.preferences.advanceBookingLimit} days in advance`);

  const conflicts = await findOverlappingBooking(carId, startTime, endTime);
  if (conflicts.length > 0) throw new Error('Car already booked for this time slot');

  const pricePerHour = group.pricePerHour || 10;
  const companyPercentage = group.companyCommissionPercentage || 10;
  const groupOwnerPercentage = group.groupOwnerCommissionPercentage || 15;

  const { totalAmount, companyCut, groupOwnerCut, carOwnerAmount, paymentStatus } =
    calculatePayment(type, durationHours, pricePerHour, companyPercentage, groupOwnerPercentage);

  let initialStatus = 'pending_payment';
  if (type === 'business') {
    initialStatus = group.preferences.autoApproveBookings ? 'confirmed' : 'pending';
  }

  const booking = await bookingWrapper.createBooking({
    user: userId,
    car: carId,
    group: groupId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: initialStatus,
    bookingTimezone,
    bookingType: type,
    totalAmount,
    companyCut,
    groupOwnerCut,
    carOwnerAmount,
    paymentStatus,
    paymentType: type === 'business' ? 'one-time' : 'subscription'
  });

  if (type === 'private' && totalAmount > 0) {
    try {
      const paymentIntent = await stripeService.createPaymentIntent({
        bookingId: booking._id.toString(),
        userId: userId,
        amount: totalAmount,
        userEmail: user.email,
        userName: user.username,
        carDetails: {
          make: booking.car.make,
          model: booking.car.model,
          year: booking.car.year,
          bookingType: type
        }
      });

      await bookingWrapper.updateBooking(booking._id, {
        stripePaymentIntentId: paymentIntent.id
      });

      return {
        booking,
        requiresPayment: true,
        nextStep: 'complete_payment',
        paymentIntent: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: totalAmount,
          customerId: paymentIntent.customerId
        }
      };
    } catch (error) {
      await bookingWrapper.updateBooking(booking._id, {
        status: 'cancelled',
        paymentStatus: 'failed'
      });
      throw new Error(`Payment creation failed: ${error.message}`);
    }
  }

  return { booking, requiresPayment: false };
};

module.exports = {
  findOverlappingBooking,
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
  extendBooking,
  getCarBookings,
  checkCarAvailability,
  bookGroupCar
};