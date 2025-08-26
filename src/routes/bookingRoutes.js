const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken'); 
const { validateBooking } = require('../validators/bookingValidators');

const {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking
} = require('../controllers/bookingController');

router.post('/BookNow', verifyToken, validateBooking, bookCar);
router.get('/MyBookings', verifyToken, getUserBookings);
router.get('/ViewBooking/:id', verifyToken, getBookingById);
router.patch('/CancelBooking/:id', verifyToken, cancelBooking);

module.exports = router;
