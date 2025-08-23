const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/verifyToken');
const { validateBooking } = require('../validators/bookingValidators'); 

const {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking
} = require('../controllers/bookingController');

router.post('/BookNow', authenticate, validateBooking, bookCar);
router.get('/MyBookings', authenticate, getUserBookings);
router.get('/ViewBooking/:id', authenticate, getBookingById);
router.patch('/CancelBooking/:id', authenticate, cancelBooking);

module.exports = router;
