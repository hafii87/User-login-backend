const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/verifyToken');
const { validateCar } = require('../validators/carValidators');

const {
  getCarsWithOwners,
  addCar,
  viewCar,
  updateCar,
  deleteCar,
} = require('../controllers/carController');

router.get('/', authenticate, getCarsWithOwners);
router.post('/', authenticate, validateCar, addCar);
router.get('/:id', authenticate, viewCar);
router.put('/:id', authenticate, validateCar, updateCar); 
router.delete('/:id', authenticate, deleteCar);

module.exports = router;