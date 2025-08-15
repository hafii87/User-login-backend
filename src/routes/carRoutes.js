const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/verifyToken');

const {
  getCarsWithOwners,
  addCar,
  viewCar,
  updateCar,
  deleteCar,
} = require('../controllers/carController');


router.get('/', authenticate, getCarsWithOwners);
router.post('/', authenticate, addCar);
router.get('/:id', authenticate, viewCar);
router.put('/:id', authenticate, updateCar);
router.delete('/:id', authenticate, deleteCar);

module.exports = router;
