const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/verifytoken'); 

const {
  getUserInfo,
  registerUser,
  loginUser,
  logoutUser,
  updateUserProfile,
  deleteUserAccount,
} = require('../controllers/usercontrollers'); 

router.get('/', authenticate, getUserInfo);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.put('/:id', authenticate, updateUserProfile);      
router.delete('/:id', authenticate, deleteUserAccount);   

module.exports = router;
