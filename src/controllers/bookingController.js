const bookingService = require('../services/bookingService');

const bookCar = async (req, res) => {
  try {
    const { carId, startTime, endTime } = req.body;

    if (!carId || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'carId, startTime, and endTime are required' });
    }

    const booking = await bookingService.bookCar(
      req.user._id,
      carId,
      new Date(startTime),
      new Date(endTime)
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user._id);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const cancelledBooking = await bookingService.cancelBooking(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: cancelledBooking });
  } catch (error) {
    const status = error.message === 'You can only cancel your own bookings' ? 403 : 404;
    res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
};
