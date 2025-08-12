const express = require('express');
const router = express.Router();
const { authenticate, protect } = require('../middleware/verifytoken'); 


const {  getCarInfo,
  addCar,
  viewCar,
  updateCar,
  deleteCar } = require('../controllers/carcontrollers');

router.get('/', authenticate, getCarInfo);
router.post('/', authenticate, addCar);
router.get('/:id', authenticate, viewCar);
router.put('/:id', authenticate, updateCar);
router.delete('/:id', authenticate, deleteCar);

module.exports = router;