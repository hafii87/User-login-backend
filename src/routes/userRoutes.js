const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/verifyToken');

const {
  getUserWithCars,
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteUserAccount,
} = require('../controllers/userController');


router.get('/profile', authenticate, getUserWithCars);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', authenticate, logoutUser);
router.put('/update/:id', authenticate, updateUserProfile);
router.delete('/delete/:id', authenticate, deleteUserAccount);

module.exports = router;
