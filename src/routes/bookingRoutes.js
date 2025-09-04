const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken'); 
const { validateBooking, validateExtendingBooking } = require('../validators/bookingValidators');

const {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
  extendBooking,
  getCarBookings
} = require('../controllers/bookingController');

router.post('/BookNow', verifyToken, validateBooking, bookCar);
router.get('/MyBookings', verifyToken, getUserBookings);
router.get('/ViewBooking/:id', verifyToken, getBookingById);
router.patch('/CancelBooking/:id', verifyToken, cancelBooking);
router.patch('/ExtendBooking/:id', verifyToken, validateExtendingBooking, extendBooking);
router.get('/CarBookings/:id', verifyToken, getCarBookings);

module.exports = router;
