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

router.use(verifyToken);

router.post('/', validateBooking, bookCar);
router.get('/user', getUserBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/extend', validateExtendingBooking, extendBooking);
router.get('/car/:id', getCarBookings);

module.exports = router;