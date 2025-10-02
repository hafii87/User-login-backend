const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const { validateBooking, validateExtendingBooking } = require('../validators/bookingValidators');

const {
  bookCar,
  getUserBookings,
  getBookingById,
  cancelBooking,
  extendBooking,
  getCarBookings,
  bookGroupCar
} = require('../controllers/bookingController');

router.use(verifyToken);

router.post('/', bookCar);
router.get('/user', getUserBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/extend', validateExtendingBooking, extendBooking);
router.get('/car/:id', getCarBookings);
router.post('/group', validateBooking, bookGroupCar);

module.exports = router;
