const bookingWrapper = require('../wrappers/bookingWrapper');
const carWrapper = require('../wrappers/carWrapper');
const groupWrapper = require('../wrappers/groupWrapper');
const userWrapper = require('../wrappers/userWrapper');
const groupService = require('./groupService');


const findOverlappingBooking = async (carId, startTime, endTime, excludeBookingId = null) => {
  try {
    const conflicts = await bookingWrapper.findOverlapping(carId, startTime, endTime, excludeBookingId);
    return conflicts;
  } catch (err) {
    throw new Error(`Error checking overlapping bookings: ${err.message}`);
  }
};

const bookCar = async (bookingData) => {
  try {
    const { user: userId, car: carId, startTime, endTime, bookingTimezone } = bookingData;

    const car = await carWrapper.getCarById(carId);
    if (!car) throw new Error('Car not found');
    if (!car.isAvailable) throw new Error('Car is not available');
    if (!car.isBookable) throw new Error('Car is not accepting bookings');

    const preferences = car.bookingPreferences || {};

    const durationHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    const durationDays = durationHours / 24;
    const advanceDays = (new Date(startTime) - new Date()) / (1000 * 60 * 60 * 24);

    if (durationHours < (preferences.minBookingHours || 1))
      throw new Error(`Minimum booking duration is ${preferences.minBookingHours || 1} hours`);
    if (durationDays > (preferences.maxBookingDays || 7))
      throw new Error(`Maximum booking duration is ${preferences.maxBookingDays || 7} days`);
    if (advanceDays > (preferences.advanceBookingDays || 30))
      throw new Error(`Cannot book more than ${preferences.advanceBookingDays || 30} days in advance`);

    if (preferences.blackoutDates && preferences.blackoutDates.length > 0) {
      const conflictingBlackout = preferences.blackoutDates.find(blackout => {
        const blackoutStart = new Date(blackout.startDate);
        const blackoutEnd = new Date(blackout.endDate);
        const bookingStart = new Date(startTime);
        const bookingEnd = new Date(endTime);
        return bookingStart < blackoutEnd && bookingEnd > blackoutStart;
      });
      if (conflictingBlackout) {
        throw new Error(`Car not available during this period: ${conflictingBlackout.reason || 'Blackout period'}`);
      }
    }

  const conflicts = await findOverlappingBooking(carId, startTime, endTime);
  if (conflicts.length > 0) throw new Error('Car already booked for this time slot');

    return await bookingWrapper.createBooking({
      user: userId,
      car: carId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'upcoming',
      bookingTimezone
    });
  } catch (error) {
    throw new Error(`Booking failed: ${error.message}`);
  }
};

const getUserBookings = async (userId) => {
  try {
    return await bookingWrapper.getUserBookings(userId);
  } catch (err) {
    throw new Error(`Error fetching user bookings: ${err.message}`);
  }
};

const getBookingById = async (bookingId) => {
  try {
    return await bookingWrapper.getBookingById(bookingId);
  } catch (err) {
    throw new Error(`Error fetching booking: ${err.message}`);
  }
};

const cancelBooking = async (bookingId, userId) => {
  try {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const bookingUserId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
    if (bookingUserId !== userId.toString()) throw new Error('You can only cancel your own bookings');

    return await bookingWrapper.cancelBooking(bookingId);
  } catch (err) {
    throw new Error(`Error cancelling booking: ${err.message}`);
  }
};

const extendBooking = async (bookingId, userId, newEndTimeUTC) => {
  try {
    const booking = await bookingWrapper.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const bookingUserId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
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

    const overlapping = await findOverlappingBooking(carId, currentEnd, newEndTimeUTC, booking.id);
    if (overlapping.length > 0)
      throw new Error('Cannot extend booking - car already booked during extended period');

    return await bookingWrapper.updateBooking(bookingId, { endTime: newEndTimeUTC });
  } catch (err) {
    throw new Error(`Error extending booking: ${err.message}`);
  }
};

const getCarBookings = async (carId, status = null) => {
  try {
    return await bookingWrapper.getCarBookings(carId, status);
  } catch (err) {
    throw new Error(`Error fetching car bookings: ${err.message}`);
  }
};

const checkCarAvailability = async (carId, startTime, endTime, excludeBookingId = null) => {
  try {
    const car = await carWrapper.getCarById(carId);
    if (!car) throw new Error('Car not found');

    const overlaps = await findOverlappingBooking(carId, startTime, endTime, excludeBookingId);

    return {
      isAvailable: overlaps.length === 0,
      conflictingBookings: overlaps
    };
  } catch (err) {
    throw new Error(`Error checking car availability: ${err.message}`);
  }
};

const bookGroupCar = async (bookingData) => {
  try {
    const { user: userId, car: carId, group: groupId, startTime, endTime, bookingTimezone } = bookingData;

    const group = await groupWrapper.getGroupById(groupId);
    if (!group) throw new Error('Group not found');

    const member = group.members.find(m => {
      const memberUserId = m.user._id ? m.user._id.toString() : m.user.toString();
      return memberUserId === userId.toString() && m.status === 'active';
    });
    if (!member) throw new Error('You are not an active member of this group');

    const carInGroup = group.cars.some(car => {
      const carIdInGroup = car._id ? car._id.toString() : car.toString();
      return carIdInGroup === carId.toString();
    });
    if (!carInGroup) throw new Error('Car is not available in this group');

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
    if (conflicts.length > 0) throw new Error('Car already booked for this time slot (group)');

    return await bookingWrapper.createBooking({
      user: userId,
      car: carId,
      group: groupId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: group.preferences.autoApproveBookings ? 'upcoming' : 'pending',
      bookingTimezone
    });
  } catch (error) {
    throw new Error(`Group booking failed: ${error.message}`);
  }
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
