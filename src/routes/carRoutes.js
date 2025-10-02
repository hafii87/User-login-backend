const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/verifyToken');
const { validateCar } = require('../validators/carValidators');

const {
  getCarsWithOwners,
  addCar,
  viewCar,
  updateCar,
  deleteCar,
  toggleCarBooking,
  searchAvailableCars
} = require('../controllers/carController');

router.get('/', verifyToken, getCarsWithOwners);
router.get('/search', verifyToken, searchAvailableCars);  
router.get('/:id', verifyToken, viewCar);                 
router.post('/', verifyToken, validateCar, addCar);
router.put('/:id', verifyToken, validateCar, updateCar);
router.delete('/:id', verifyToken, deleteCar);
router.patch('/:id/toggle-booking', verifyToken, toggleCarBooking);

module.exports = router;
