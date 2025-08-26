const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken'); 
const { validateCar } = require('../validators/carValidators');

const {
  getCarsWithOwners,
  addCar,
  viewCar,
  updateCar,
  deleteCar,
} = require('../controllers/carController');


router.get('/', verifyToken, getCarsWithOwners);
router.post('/', verifyToken, validateCar, addCar);
router.get('/:id', verifyToken, viewCar);
router.put('/:id', verifyToken, validateCar, updateCar);
router.delete('/:id', verifyToken, deleteCar);

module.exports = router;
