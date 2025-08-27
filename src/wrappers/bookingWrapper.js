const Booking = require('../models/bookingModel');

const createBooking = async (data) => {
  try {
    const booking = await Booking.create(data);
    return await Booking.findById(booking._id)
      .populate('car', 'make model year price')
      .populate('user', 'username email');
  } catch (error) {
    throw new Error(`Error creating booking: ${error.message}`);
  }
};

const findOverlapping = async (carId, startTime, endTime) => {
  try {
    return await Booking.find({
      car: carId,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });
  } catch (error) {
    throw new Error(`Error checking overlapping bookings: ${error.message}`);
  }
};

const getUserBookings = async (userId) => {
  try {
    return await Booking.find({ user: userId })
      .populate('car', 'make model year price owner')
      .populate('user', 'username email')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(`Error fetching user bookings: ${error.message}`);
  }
};

const getBookingById = async (bookingId) => {
  try {
    return await Booking.findById(bookingId)
      .populate('car', 'make model year price owner')
      .populate('user', 'username email');
  } catch (error) {
    throw new Error(`Error fetching booking by ID: ${error.message}`);
  }
};

const cancelBooking = async (bookingId) => {
  try {
    return await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'cancelled' },
      { new: true }
    )
      .populate('car', 'make model year price')
      .populate('user', 'username email');
  } catch (error) {
    throw new Error(`Error cancelling booking: ${error.message}`);
  }
};

const getCarBookings = async (carId, status = null) => {
  try {
    const query = { car: carId };
    if (status) query.status = status;

    return await Booking.find(query)
      .populate('user', 'username email')
      .sort({ startTime: 1 });
  } catch (error) {
    throw new Error(`Error fetching car bookings: ${error.message}`);
  }
};

const extendBooking = async (bookingId, userId, newEndTime) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (booking.user.toString() !== userId.toString()) throw new Error('Unauthorized');
  if (new Date(newEndTime) <= booking.endTime) throw new Error('New end time must be later');

  const overlapping = await Booking.find({
    car: booking.car,
    startTime: { $lt: newEndTime },
    endTime: { $gt: booking.endTime }
  });
  if (overlapping.length > 0) throw new Error('Car already booked in extended time');

  booking.endTime = newEndTime;
  return await booking.save();
};

const updateBooking = async (bookingId, updateData) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    Object.assign(booking, updateData);
    return await booking.save();
  } catch (error) {
    throw new Error(`Error updating booking: ${error.message}`);
  }
};

module.exports = {
  createBooking,
  findOverlapping,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getCarBookings,
  extendBooking,
  updateBooking
};
