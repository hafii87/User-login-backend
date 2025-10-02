const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');

const {
  getAllBookings,
  getAllUsers,
  getAllCars,
  deleteUser,
  deleteCar,
  getDashboardStats
} = require('../controllers/adminController');

router.use(verifyToken);
router.use(isAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/bookings', getAllBookings);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/cars', getAllCars);
router.delete('/cars/:id', deleteCar);

module.exports = router;
