const Booking = require('../models/bookingModel');

const createBooking = async (data) => {
  try {
    const booking = await Booking.create(data);
    return await Booking.findById(booking._id)
      .populate('car', 'make model year price owner')
      .populate('user', 'username email');
  } catch (error) {
    throw new Error(`Error creating booking: ${error.message}`);
  }
};

const findOverlapping = async (carId, startTime, endTime) => {
  try {
    return await Booking.find({
      car: carId,
      status: { $in: ['upcoming', 'ongoing'] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
      isStarted: false
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

const updateBooking = async (bookingId, updateData) => {
  try {
    const options = {
      new: true,
      runValidators: false
    };
    
    const booking = await Booking.findByIdAndUpdate(
      bookingId, 
      updateData, 
      options
    )
      .populate('car', 'make model year price owner')
      .populate('user', 'username email');
    
    if (!booking) throw new Error('Booking not found');
    
    if (updateData.endTime && booking.startTime) {
      const newEndTime = new Date(updateData.endTime);
      const startTime = new Date(booking.startTime);
      
      if (newEndTime <= startTime) {
        throw new Error('End time must be after start time');
      }
    }
    
    return booking;
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
  updateBooking
};
