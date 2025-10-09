const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/verifyToken');

const {
  getUserWithCars,
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteUserAccount,
  verifyEmail,
} = require('../controllers/userController');


router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', verifyToken, getUserWithCars);
router.post('/logout', verifyToken, logoutUser);
router.put('/update/:id', verifyToken, updateUserProfile);
router.delete('/delete/', verifyToken, deleteUserAccount);
router.get('/verify-email/:token', verifyEmail);

module.exports = router;
